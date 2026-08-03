package com.hospitalai.core.controller;

import com.hospitalai.core.model.Dto.DecisionRequest;
import com.hospitalai.core.model.Dto.DecisionResponse;
import com.hospitalai.core.model.Dto.DoseRequest;
import com.hospitalai.core.model.Dto.DoseResponse;
import com.hospitalai.core.model.Dto.EvidenceChunkSummary;
import com.hospitalai.core.model.Dto.RuleLifecycleResponse;
import com.hospitalai.core.model.Dto.RuleUpsertRequest;
import com.hospitalai.core.model.Dto.SnapshotImportRequest;
import com.hospitalai.core.model.Dto.SnapshotImportResponse;
import com.hospitalai.core.model.Dto.WorkbenchPayload;
import com.hospitalai.core.model.Dto.WorklistItem;
import com.hospitalai.core.model.Dto.RuleGovernancePayload;
import com.hospitalai.core.repository.WorkbenchRepository;
import com.hospitalai.core.service.DoseCalculationService;
import com.hospitalai.core.service.HisSnapshotImportService;
import com.hospitalai.core.service.RecommendationService;
import com.hospitalai.core.service.RuleGovernanceService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class WorkbenchController {
  private final RecommendationService service;
  private final WorkbenchRepository repository;
  private final HisSnapshotImportService importService;
  private final RuleGovernanceService ruleGovernanceService;
  private final DoseCalculationService doseCalculationService;

  public WorkbenchController(RecommendationService service, WorkbenchRepository repository, HisSnapshotImportService importService, RuleGovernanceService ruleGovernanceService, DoseCalculationService doseCalculationService) {
    this.service = service;
    this.repository = repository;
    this.importService = importService;
    this.ruleGovernanceService = ruleGovernanceService;
    this.doseCalculationService = doseCalculationService;
  }

  @GetMapping("/worklist")
  public List<WorklistItem> worklist() {
    return repository.worklist();
  }

  @GetMapping("/rules")
  public RuleGovernancePayload rules() {
    return new RuleGovernancePayload(repository.clinicalRules(), repository.clinicalRuleCases());
  }

  @PostMapping("/rules")
  public RuleLifecycleResponse saveRuleDraft(@RequestBody RuleUpsertRequest request) {
    return ruleGovernanceService.saveDraft(request);
  }

  @PostMapping("/rules/{ruleId}/versions/{version}/submit-review")
  public RuleLifecycleResponse submitRuleReview(@PathVariable String ruleId, @PathVariable String version) {
    return ruleGovernanceService.submitReview(ruleId, version);
  }

  @PostMapping("/rules/{ruleId}/versions/{version}/publish")
  public RuleLifecycleResponse publishRule(@PathVariable String ruleId, @PathVariable String version) {
    return ruleGovernanceService.publish(ruleId, version);
  }

  @PostMapping("/rules/{ruleId}/versions/{version}/withdraw")
  public RuleLifecycleResponse withdrawRule(@PathVariable String ruleId, @PathVariable String version) {
    return ruleGovernanceService.withdraw(ruleId, version);
  }

  @PostMapping("/dose/calculate")
  public DoseResponse calculateDose(@RequestBody DoseRequest request) {
    return doseCalculationService.calculate(request);
  }

  @GetMapping("/evidence/chunks")
  public List<EvidenceChunkSummary> evidenceChunks(@RequestParam(defaultValue = "社区获得性肺炎") String query) {
    return repository.publishedEvidenceChunks(query);
  }

  @GetMapping("/workbench/{encounterId}")
  public WorkbenchPayload workbench(@PathVariable String encounterId) {
    return service.buildWorkbench(encounterId);
  }

  @PostMapping("/recommendations/{recommendationId}/decision")
  public DecisionResponse decide(@PathVariable String recommendationId, @RequestBody DecisionRequest request) {
    return service.decide(recommendationId, request);
  }

  @PostMapping("/integration/his/snapshots/import")
  public SnapshotImportResponse importSnapshot(@RequestBody SnapshotImportRequest request) {
    return importService.importSnapshot(request);
  }

  @GetMapping("/debug/persistence")
  public Map<String, Object> persistence() {
    return repository.latestPersistenceSnapshot();
  }

  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, Object> badRequest(IllegalArgumentException ex) {
    return Map.of("error", ex.getMessage());
  }
}
