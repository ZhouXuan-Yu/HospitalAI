package com.hospitalai.core.service;

import com.hospitalai.core.model.Dto.*;
import com.hospitalai.core.repository.WorkbenchRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {
  private final WorkbenchRepository repo;
  private final String aiBaseUrl;
  private final HttpClient aiClient = HttpClient.newHttpClient();
  private final ObjectMapper mapper = new ObjectMapper();
  private final String actor;

  public RecommendationService(WorkbenchRepository repo, @Value("${ai.service-base-url}") String aiBaseUrl, @Value("${hospitalai.dev-user}") String actor) {
    this.repo = repo;
    this.aiBaseUrl = aiBaseUrl;
    this.actor = actor;
  }

  public WorkbenchPayload buildWorkbench(String encounterId) {
    var started = Instant.now();
    var patient = repo.patientForEncounter(encounterId);
    var encounter = repo.encounter(encounterId);
    var facts = repo.facts(encounterId, patient.patientId());
    var stages = new ArrayList<StageState>();
    stages.add(stage("patient_context", "complete", started, "合成 HIS 快照已汇总，原始事实未被 AI 覆盖"));

    var alerts = evaluateRules(encounter, patient);
    var recommendationId = "REC-" + encounterId + "-v" + encounter.dataVersion();
    alerts.forEach(alert -> repo.insertRuleExecution(recommendationId, encounterId, alert));
    stages.add(stage("deterministic_rules", "complete", started, "Java 硬规则已执行，阻断风险不可绕过"));

    var evidence = retrieveEvidence(encounter, patient, facts, stages, started);
    var missing = repo.missingLabs(encounterId).stream().map(row -> row.get("name") + " 缺失，来源 " + row.get("source_id")).toList();
    var candidates = buildCandidates(patient.patientId(), alerts, evidence, missing);
    stages.add(stage("candidate_ranking", "complete", started, "候选仅来自模拟院内药品目录，演示规则不含自由剂量生成"));

    repo.audit(actor, "WORKBENCH_OPENED", encounterId, "opened recommendation " + recommendationId);
    return new WorkbenchPayload(patient, encounter, facts, alerts, candidates, missing, stages, recommendationId, evidence.isEmpty() ? "degraded" : "deterministic-demo");
  }

  public DecisionResponse decide(String recommendationId, DecisionRequest request) {
    var encounterId = recommendationId.replaceFirst("^REC-", "").replaceFirst("-v\\d+$", "");
    var payload = buildWorkbench(encounterId);
    var selected = payload.candidates().stream().filter(c -> c.candidateId().equals(request.candidateId())).findFirst()
        .orElseThrow(() -> new IllegalArgumentException("unknown candidate"));
    var blockingMessages = payload.alerts().stream().filter(SafetyAlert::blocking).map(SafetyAlert::message).toList();
    if (selected.blocked() || !blockingMessages.isEmpty()) {
      repo.audit(actor, "DECISION_BLOCKED", recommendationId, String.join("; ", blockingMessages));
      return new DecisionResponse("", request.action(), "", "BLOCKED_BY_HARD_RULE", List.of("DECISION_BLOCKED"), true);
    }
    var decisionId = "DEC-" + UUID.randomUUID();
    repo.insertDecision(decisionId, recommendationId, encounterId, request, actor);
    repo.audit(actor, "RECOMMENDATION_DECIDED", decisionId, request.action() + " candidate " + request.candidateId());
    var draftId = "";
    var draftStatus = "NO_DRAFT_FOR_REJECTION";
    if (!"reject".equalsIgnoreCase(request.action())) {
      draftId = repo.insertDraft(decisionId, encounterId);
      draftStatus = "SIMULATED_DRAFT_WRITTEN";
      repo.audit(actor, "HIS_DRAFT_WRITE_SIMULATED", draftId, "处方草稿模拟回写，非正式医嘱");
    }
    return new DecisionResponse(decisionId, request.action(), draftId, draftStatus, List.of("RECOMMENDATION_DECIDED", "HIS_DRAFT_WRITE_SIMULATED"), false);
  }

  List<SafetyAlert> evaluateRules(Encounter encounter, PatientProfile patient) {
    var alerts = new ArrayList<SafetyAlert>();
    var allergyRule = repo.rule("HR-ALG-001");
    for (var allergy : repo.confirmedAllergies(patient.patientId())) {
      alerts.add(new SafetyAlert(allergyRule.ruleId(), allergyRule.version(), allergyRule.status(), allergyRule.severity(),
          "已确认药物过敏：后续就诊必须继承并阻断 " + allergy.get("drug_name"),
          List.of(String.valueOf(allergy.get("source_id"))), true));
    }
    var adrRule = repo.rule("HR-ADR-001");
    for (var adr : repo.severeAdrs(patient.patientId())) {
      alerts.add(new SafetyAlert(adrRule.ruleId(), adrRule.version(), adrRule.status(), adrRule.severity(),
          "医院演示规则：严重不良反应需强提醒 " + adr.get("drug_name"),
          List.of(String.valueOf(adr.get("source_id"))), false));
    }
    var crossDepartmentRule = repo.rule("HR-XDEPT-001");
    var orders = repo.activeOrders(patient.patientId());
    for (var order : orders) {
      alerts.add(new SafetyAlert(crossDepartmentRule.ruleId(), crossDepartmentRule.version(), crossDepartmentRule.status(), crossDepartmentRule.severity(),
          "跨科室当前有效用药需复核：" + order.get("department") + " 已有 " + order.get("drug_name"),
          List.of(String.valueOf(order.get("source_id"))), false));
    }
    var missingRule = repo.rule("HR-MISS-001");
    for (var lab : repo.missingLabs(encounter.encounterId())) {
      alerts.add(new SafetyAlert(missingRule.ruleId(), missingRule.version(), missingRule.status(), missingRule.severity(),
          "关键检验缺失：" + lab.get("name") + "，不得按正常值处理",
          List.of(String.valueOf(lab.get("source_id"))), false));
    }
    return alerts;
  }

  private List<EvidenceSnippet> retrieveEvidence(Encounter encounter, PatientProfile patient, List<Fact> facts, List<StageState> stages, Instant started) {
    try {
      @SuppressWarnings("unchecked")
      var requestBody = mapper.writeValueAsString(new EvidenceRequest(encounter.encounterId(), patient.patientId(), encounter.diagnosis(), facts.stream().map(Fact::label).toList()));
      var request = HttpRequest.newBuilder(URI.create(aiBaseUrl + "/v1/evidence/retrieve"))
          .version(HttpClient.Version.HTTP_1_1)
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(requestBody))
          .build();
      var httpResponse = aiClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (httpResponse.statusCode() >= 300) {
        throw new IllegalStateException(httpResponse.statusCode() + " from AI service: " + httpResponse.body());
      }
      Map<String, Object> response = mapper.readValue(httpResponse.body(), new TypeReference<>() {});
      stages.add(stage("controlled_evidence", "complete", started, "FastAPI 受控证据检索完成"));
      @SuppressWarnings("unchecked")
      List<Map<String, Object>> items = (List<Map<String, Object>>) response.getOrDefault("snippets", List.of());
      return items.stream().map(item -> new EvidenceSnippet(
          String.valueOf(item.get("evidenceId")),
          String.valueOf(item.get("title")),
          String.valueOf(item.get("status")),
          String.valueOf(item.get("version")),
          String.valueOf(item.get("effectiveDate")),
          String.valueOf(item.get("locator")),
          String.valueOf(item.get("text")),
          Double.parseDouble(String.valueOf(item.get("score")))
      )).toList();
    } catch (Exception ex) {
      stages.add(stage("controlled_evidence", "degraded", started, "AI 服务不可用；保留患者事实和硬规则结果；" + ex.getMessage()));
      return List.of();
    }
  }

  private List<CandidatePlan> buildCandidates(String patientId, List<SafetyAlert> alerts, List<EvidenceSnippet> evidence, List<String> missing) {
    var allergyBlocked = alerts.stream().anyMatch(a -> a.ruleId().equals("HR-ALG-001"));
    var crossDept = alerts.stream().anyMatch(a -> a.ruleId().equals("HR-XDEPT-001"));
    var noEvidenceText = evidence.isEmpty() ? List.of("证据不足：解释服务降级，禁止补写理由") : List.<String>of();
    var candidates = new ArrayList<CandidatePlan>();
    candidates.add(new CandidatePlan("C-CEF-AZI", "推荐方案", List.of("D-CEF", "D-AZI"), "头孢曲松 + 阿奇霉素，剂量待医生按院内规则表确认",
        evidence.isEmpty() ? "证据不足" : "覆盖 CAP 演示路径，需结合当前检验和跨科室用药复核",
        "覆盖常见初始路径；若已在其他科室使用同类或存在心律相关风险需药师复核",
        concat(noEvidenceText, crossDept ? List.of("存在跨科室当前有效用药提醒") : List.of()), List.of("过敏史", "肌酐", "CRP", "当前有效用药"), evidence, List.of("万古霉素：不在当前模拟目录可用状态"), false));
    candidates.add(new CandidatePlan("C-AMOX", "备选方案", List.of("D-AMOX"), "阿莫西林克拉维酸钾，剂量待医生按院内规则表确认",
        allergyBlocked ? "命中已确认过敏，不能作为正常候选提交" : "可作为目录内备选，需证据和检验完整性支持",
        "青霉素类方案；对确认过敏患者硬阻断",
        allergyBlocked ? List.of("已确认过敏硬阻断") : noEvidenceText, List.of("过敏史", "肾功能"), evidence, List.of(), allergyBlocked));
    candidates.add(new CandidatePlan("C-LEV", "特定条件方案", List.of("D-LEV"), "左氧氟沙星，剂量待医生按院内规则表确认",
        "仅作为特定条件下的可比较方案；严重 ADR 患者强提醒",
        "喹诺酮类；需要更严格风险复核",
        concat(noEvidenceText, repo.severeAdrs(patientId).isEmpty() ? List.of() : List.of("历史严重不良反应强提醒")), List.of("不良反应史", "肾功能", "心电风险"), evidence, missing, false));
    return candidates;
  }

  private static List<String> concat(List<String> first, List<String> second) {
    var out = new ArrayList<String>(first);
    out.addAll(second);
    return out;
  }

  private static StageState stage(String name, String status, Instant started, String detail) {
    return new StageState(name, status, Duration.between(started, Instant.now()).toMillis(), detail);
  }

  private record EvidenceRequest(String encounterId, String patientId, String diagnosis, List<String> facts) {}
}
