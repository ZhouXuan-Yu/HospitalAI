package com.hospitalai.core.controller;

import com.hospitalai.core.model.Dto.DecisionRequest;
import com.hospitalai.core.model.Dto.DecisionResponse;
import com.hospitalai.core.model.Dto.DoseRequest;
import com.hospitalai.core.model.Dto.DoseResponse;
import com.hospitalai.core.model.Dto.CollaborationResolutionRequest;
import com.hospitalai.core.model.Dto.CollaborationTaskSummary;
import com.hospitalai.core.model.Dto.DraftRetryRequest;
import com.hospitalai.core.model.Dto.EvidenceChunkSummary;
import com.hospitalai.core.model.Dto.EvidenceDocumentRequest;
import com.hospitalai.core.model.Dto.EvidenceDocumentSummary;
import com.hospitalai.core.model.Dto.EvidenceLifecycleResponse;
import com.hospitalai.core.model.Dto.EvidenceParseRequest;
import com.hospitalai.core.model.Dto.PharmacistReviewResolutionRequest;
import com.hospitalai.core.model.Dto.PharmacistReviewTaskSummary;
import com.hospitalai.core.model.Dto.PrescriptionDraftCallbackRequest;
import com.hospitalai.core.model.Dto.PrescriptionDraftStatus;
import com.hospitalai.core.model.Dto.PrescriptionDraftWriteTaskSummary;
import com.hospitalai.core.model.Dto.RecommendationSnapshotSummary;
import com.hospitalai.core.model.Dto.RuleLifecycleResponse;
import com.hospitalai.core.model.Dto.RuleUpsertRequest;
import com.hospitalai.core.model.Dto.SnapshotImportRequest;
import com.hospitalai.core.model.Dto.SnapshotImportResponse;
import com.hospitalai.core.model.Dto.WorkbenchPayload;
import com.hospitalai.core.model.Dto.WorklistItem;
import com.hospitalai.core.model.Dto.RuleGovernancePayload;
import com.hospitalai.core.repository.WorkbenchRepository;
import com.hospitalai.core.service.DoseCalculationService;
import com.hospitalai.core.service.EvidenceGovernanceService;
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
  private final EvidenceGovernanceService evidenceGovernanceService;

  public WorkbenchController(RecommendationService service, WorkbenchRepository repository, HisSnapshotImportService importService, RuleGovernanceService ruleGovernanceService, DoseCalculationService doseCalculationService, EvidenceGovernanceService evidenceGovernanceService) {
    this.service = service;
    this.repository = repository;
    this.importService = importService;
    this.ruleGovernanceService = ruleGovernanceService;
    this.doseCalculationService = doseCalculationService;
    this.evidenceGovernanceService = evidenceGovernanceService;
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

  @GetMapping("/evidence/documents")
  public List<EvidenceDocumentSummary> evidenceDocuments() {
    return repository.evidenceDocuments();
  }

  @PostMapping("/evidence/documents")
  public EvidenceLifecycleResponse uploadEvidence(@RequestBody EvidenceDocumentRequest request) {
    return evidenceGovernanceService.upload(request);
  }

  @PostMapping("/evidence/documents/{evidenceId}/parse")
  public EvidenceLifecycleResponse parseEvidence(@PathVariable String evidenceId, @RequestBody(required = false) EvidenceParseRequest request) {
    return evidenceGovernanceService.parse(evidenceId, request);
  }

  @PostMapping("/evidence/documents/{evidenceId}/publish")
  public EvidenceLifecycleResponse publishEvidence(@PathVariable String evidenceId) {
    return evidenceGovernanceService.publish(evidenceId);
  }

  @PostMapping("/evidence/documents/{evidenceId}/withdraw")
  public EvidenceLifecycleResponse withdrawEvidence(@PathVariable String evidenceId) {
    return evidenceGovernanceService.withdraw(evidenceId);
  }

  @GetMapping("/workbench/{encounterId}")
  public WorkbenchPayload workbench(@PathVariable String encounterId) {
    return service.buildWorkbench(encounterId);
  }

  @GetMapping("/recommendations")
  public List<RecommendationSnapshotSummary> recommendations() {
    return repository.recommendationSnapshots();
  }

  @PostMapping("/recommendations/{recommendationId}/decision")
  public DecisionResponse decide(@PathVariable String recommendationId, @RequestBody DecisionRequest request) {
    return service.decide(recommendationId, request);
  }

  @GetMapping("/pharmacist/reviews")
  public List<PharmacistReviewTaskSummary> pharmacistReviews(@RequestParam(required = false) String status) {
    return repository.pharmacistReviews(status);
  }

  @PostMapping("/pharmacist/reviews/{reviewId}/resolve")
  public Map<String, Object> resolvePharmacistReview(@PathVariable String reviewId, @RequestBody PharmacistReviewResolutionRequest request) {
    if (request == null || request.resolution() == null || request.resolution().isBlank()) {
      throw new IllegalArgumentException("resolution is required");
    }
    repository.resolvePharmacistReview(reviewId, request.resolution());
    repository.audit("pharmacist_demo", "PHARMACIST_REVIEW_RESOLVED", reviewId, request.resolution());
    return Map.of("reviewId", reviewId, "status", "resolved");
  }

  @GetMapping("/collaboration/tasks")
  public List<CollaborationTaskSummary> collaborationTasks(@RequestParam(required = false) String status) {
    return repository.collaborationTasks(status);
  }

  @PostMapping("/collaboration/tasks/{taskId}/resolve")
  public Map<String, Object> resolveCollaborationTask(@PathVariable String taskId, @RequestBody CollaborationResolutionRequest request) {
    if (request == null || request.resolution() == null || request.resolution().isBlank()) {
      throw new IllegalArgumentException("resolution is required");
    }
    repository.resolveCollaborationTask(taskId, request.resolution());
    repository.audit("department_collaboration_demo", "COLLABORATION_TASK_RESOLVED", taskId, request.resolution());
    return Map.of("taskId", taskId, "status", "resolved");
  }

  @GetMapping("/prescription-drafts/{draftId}")
  public PrescriptionDraftStatus prescriptionDraft(@PathVariable String draftId) {
    return repository.draft(draftId);
  }

  @PostMapping("/prescription-drafts/{draftId}/callback")
  public PrescriptionDraftStatus prescriptionDraftCallback(@PathVariable String draftId, @RequestBody PrescriptionDraftCallbackRequest request) {
    if (request == null || request.hisStatus() == null || request.hisStatus().isBlank()) {
      throw new IllegalArgumentException("hisStatus is required");
    }
    String status = switch (request.hisStatus()) {
      case "his_confirmed" -> "his_confirmed";
      case "his_cancelled" -> "his_cancelled";
      default -> "callback_received";
    };
    repository.updateDraftCallback(draftId, status, request.hisStatus(), request.hisMessage());
    repository.markDraftWriteTaskWritten(draftId);
    repository.audit("his_adapter", "HIS_DRAFT_CALLBACK_RECEIVED", draftId, request.hisStatus());
    return repository.draft(draftId);
  }

  @GetMapping("/prescription-draft-write-tasks")
  public List<PrescriptionDraftWriteTaskSummary> draftWriteTasks(@RequestParam(required = false) String status) {
    return repository.draftWriteTasks(status);
  }

  @PostMapping("/prescription-draft-write-tasks/{taskId}/mark-failed")
  public Map<String, Object> markDraftWriteTaskFailed(@PathVariable String taskId, @RequestBody(required = false) DraftRetryRequest request) {
    String message = request == null || request.errorMessage() == null || request.errorMessage().isBlank()
        ? "HIS adapter write failed"
        : request.errorMessage();
    repository.markDraftWriteTaskFailure(taskId, message);
    repository.audit("his_adapter", "HIS_DRAFT_WRITE_FAILED", taskId, message);
    return Map.of("taskId", taskId, "status", "retry_or_dead_letter_recorded");
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
