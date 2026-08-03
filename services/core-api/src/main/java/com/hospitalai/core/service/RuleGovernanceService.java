package com.hospitalai.core.service;

import com.hospitalai.core.model.Dto.RuleLifecycleResponse;
import com.hospitalai.core.model.Dto.RuleUpsertRequest;
import com.hospitalai.core.repository.WorkbenchRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RuleGovernanceService {
  private final WorkbenchRepository repo;
  private final String actor;

  public RuleGovernanceService(WorkbenchRepository repo, @Value("${hospitalai.dev-user}") String actor) {
    this.repo = repo;
    this.actor = actor;
  }

  @Transactional
  public RuleLifecycleResponse saveDraft(RuleUpsertRequest request) {
    requireRule(request);
    repo.upsertRuleDraft(request);
    repo.audit(actor, "RULE_DRAFT_SAVED", request.ruleId(), request.ruleId() + "@" + request.version());
    return new RuleLifecycleResponse(request.ruleId(), request.version(), "draft", "RULE_DRAFT_SAVED");
  }

  @Transactional
  public RuleLifecycleResponse submitReview(String ruleId, String version) {
    repo.updateRuleStatus(ruleId, version, "review_pending", false);
    repo.audit(actor, "RULE_REVIEW_REQUESTED", ruleId, ruleId + "@" + version);
    return new RuleLifecycleResponse(ruleId, version, "review_pending", "RULE_REVIEW_REQUESTED");
  }

  @Transactional
  public RuleLifecycleResponse publish(String ruleId, String version) {
    repo.updateRuleStatus(ruleId, version, "published", true);
    repo.audit(actor, "RULE_PUBLISHED", ruleId, ruleId + "@" + version);
    return new RuleLifecycleResponse(ruleId, version, "published", "RULE_PUBLISHED");
  }

  @Transactional
  public RuleLifecycleResponse withdraw(String ruleId, String version) {
    repo.updateRuleStatus(ruleId, version, "withdrawn", false);
    repo.audit(actor, "RULE_WITHDRAWN", ruleId, ruleId + "@" + version);
    return new RuleLifecycleResponse(ruleId, version, "withdrawn", "RULE_WITHDRAWN");
  }

  private static void requireRule(RuleUpsertRequest request) {
    if (request == null || blank(request.ruleId()) || blank(request.version()) || blank(request.name())
        || blank(request.severity()) || blank(request.basis()) || blank(request.deterministicHandler())) {
      throw new IllegalArgumentException("ruleId, version, name, severity, basis and deterministicHandler are required");
    }
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
