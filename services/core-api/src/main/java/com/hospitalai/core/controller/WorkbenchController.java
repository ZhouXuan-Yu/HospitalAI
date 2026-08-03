package com.hospitalai.core.controller;

import com.hospitalai.core.model.Dto.DecisionRequest;
import com.hospitalai.core.model.Dto.DecisionResponse;
import com.hospitalai.core.model.Dto.DoseRequest;
import com.hospitalai.core.model.Dto.DoseResponse;
import com.hospitalai.core.model.Dto.CollaborationResolutionRequest;
import com.hospitalai.core.model.Dto.CollaborationTaskSummary;
import com.hospitalai.core.model.Dto.DischargeOutcomeRequest;
import com.hospitalai.core.model.Dto.DischargeOutcomeSummary;
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
import com.hospitalai.core.model.Dto.MedicationFeedbackRequest;
import com.hospitalai.core.model.Dto.MedicationFeedbackSummary;
import com.hospitalai.core.model.Dto.RecommendationSnapshotSummary;
import com.hospitalai.core.model.Dto.KnowledgeReviewRequest;
import com.hospitalai.core.model.Dto.KnowledgeReviewSummary;
import com.hospitalai.core.model.Dto.KnowledgeSubmissionRequest;
import com.hospitalai.core.model.Dto.KnowledgeSubmissionSummary;
import com.hospitalai.core.model.Dto.ResearchAnalysisRunRequest;
import com.hospitalai.core.model.Dto.ResearchAnalysisRunSummary;
import com.hospitalai.core.model.Dto.ResearchAnalysisTaskSummary;
import com.hospitalai.core.model.Dto.ResearchArtifactContent;
import com.hospitalai.core.model.Dto.ResearchCohortRequest;
import com.hospitalai.core.model.Dto.ResearchCohortSummary;
import com.hospitalai.core.model.Dto.ResearchExportRequest;
import com.hospitalai.core.model.Dto.ResearchExportSummary;
import com.hospitalai.core.model.Dto.ResearchQualityCheckSummary;
import com.hospitalai.core.model.Dto.ResearchReportDraftSummary;
import com.hospitalai.core.model.Dto.ResearchReportReviewRequest;
import com.hospitalai.core.model.Dto.ResearchTaskFailureRequest;
import com.hospitalai.core.model.Dto.ResearchVariableRequest;
import com.hospitalai.core.model.Dto.ResearchVariableSummary;
import com.hospitalai.core.model.Dto.RuleLifecycleResponse;
import com.hospitalai.core.model.Dto.RuleUpsertRequest;
import com.hospitalai.core.model.Dto.SnapshotImportRequest;
import com.hospitalai.core.model.Dto.SnapshotImportResponse;
import com.hospitalai.core.model.Dto.WorkbenchPayload;
import com.hospitalai.core.model.Dto.WorklistItem;
import com.hospitalai.core.model.Dto.RuleGovernancePayload;
import com.hospitalai.core.model.Dto.TimelineEventRequest;
import com.hospitalai.core.model.Dto.TimelineEventSummary;
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

  @GetMapping("/patients/{patientId}/timeline")
  public List<TimelineEventSummary> timeline(@PathVariable String patientId) {
    return repository.timeline(patientId);
  }

  @PostMapping("/patients/{patientId}/timeline")
  public TimelineEventSummary addTimelineEvent(@PathVariable String patientId, @RequestBody TimelineEventRequest request) {
    TimelineEventRequest normalized = new TimelineEventRequest(patientId, request.encounterId(), request.eventType(), request.drugCode(), request.drugName(), request.sourceSystem(), request.sourceId(), request.detail());
    var event = repository.insertTimelineEvent(normalized);
    repository.audit("tracking_demo", "TIMELINE_EVENT_RECORDED", event.eventId(), event.eventType());
    return event;
  }

  @GetMapping("/patients/{patientId}/feedback")
  public List<MedicationFeedbackSummary> feedback(@PathVariable String patientId) {
    return repository.feedback(patientId);
  }

  @PostMapping("/patients/{patientId}/feedback")
  public MedicationFeedbackSummary addFeedback(@PathVariable String patientId, @RequestBody MedicationFeedbackRequest request) {
    MedicationFeedbackRequest normalized = new MedicationFeedbackRequest(patientId, request.encounterId(), request.drugCode(), request.effectiveness(), request.adverseSignal(), request.reporterRole(), request.note());
    var feedback = repository.insertFeedback(normalized);
    repository.audit("tracking_demo", "MEDICATION_FEEDBACK_RECORDED", feedback.feedbackId(), feedback.adverseSignal());
    if (!"none".equalsIgnoreCase(feedback.adverseSignal())) {
      repository.insertTimelineEvent(new TimelineEventRequest(patientId, request.encounterId(), "adverse_signal", request.drugCode(), "", "HospitalAI", feedback.feedbackId(), feedback.note()));
    }
    return feedback;
  }

  @GetMapping("/patients/{patientId}/outcomes")
  public List<DischargeOutcomeSummary> dischargeOutcomes(@PathVariable String patientId) {
    return repository.dischargeOutcomes(patientId);
  }

  @PostMapping("/patients/{patientId}/outcomes")
  public DischargeOutcomeSummary addDischargeOutcome(@PathVariable String patientId, @RequestBody DischargeOutcomeRequest request) {
    DischargeOutcomeRequest normalized = new DischargeOutcomeRequest(patientId, request.encounterId(), request.outcomeStatus(), request.readmissionRisk(), request.followupRequired(), request.note());
    var outcome = repository.insertDischargeOutcome(normalized);
    repository.audit("tracking_demo", "DISCHARGE_OUTCOME_RECORDED", outcome.outcomeId(), outcome.outcomeStatus());
    return outcome;
  }

  @GetMapping("/research/cohorts")
  public List<ResearchCohortSummary> cohorts() {
    return repository.cohorts();
  }

  @PostMapping("/research/cohorts")
  public ResearchCohortSummary saveCohort(@RequestBody ResearchCohortRequest request) {
    var cohort = repository.upsertCohort(request);
    repository.audit("research_demo", "RESEARCH_COHORT_SAVED", cohort.cohortId(), cohort.name());
    return cohort;
  }

  @GetMapping("/research/cohorts/{cohortId}/variables")
  public List<ResearchVariableSummary> variables(@PathVariable String cohortId) {
    return repository.variables(cohortId);
  }

  @PostMapping("/research/cohorts/{cohortId}/variables")
  public ResearchVariableSummary saveVariable(@PathVariable String cohortId, @RequestBody ResearchVariableRequest request) {
    var variable = repository.upsertVariable(cohortId, request);
    repository.audit("research_demo", "RESEARCH_VARIABLE_SAVED", variable.variableId(), variable.name());
    return variable;
  }

  @PostMapping("/research/cohorts/{cohortId}/quality-check")
  public ResearchQualityCheckSummary runQualityCheck(@PathVariable String cohortId) {
    var check = repository.runQualityCheck(cohortId);
    repository.audit("research_demo", "RESEARCH_QUALITY_CHECKED", check.checkId(), check.status());
    return check;
  }

  @PostMapping("/research/cohorts/{cohortId}/freeze")
  public ResearchCohortSummary freezeCohort(@PathVariable String cohortId) {
    repository.freezeCohort(cohortId);
    repository.audit("research_demo", "RESEARCH_COHORT_FROZEN", cohortId, "frozen");
    return repository.cohort(cohortId);
  }

  @GetMapping("/research/cohorts/{cohortId}/analysis-runs")
  public List<ResearchAnalysisRunSummary> analysisRuns(@PathVariable String cohortId) {
    return repository.analysisRuns(cohortId);
  }

  @GetMapping("/research/cohorts/{cohortId}/analysis-tasks")
  public List<ResearchAnalysisTaskSummary> analysisTasks(@PathVariable String cohortId, @RequestParam(required = false) String status) {
    return repository.analysisTasks(cohortId, status);
  }

  @PostMapping("/research/cohorts/{cohortId}/analysis-tasks")
  public ResearchAnalysisTaskSummary enqueueAnalysisTask(@PathVariable String cohortId, @RequestBody(required = false) ResearchAnalysisRunRequest request) {
    ResearchAnalysisRunRequest normalized = request == null
        ? new ResearchAnalysisRunRequest("fixed-cap-statistics.v1", "CAP cohort descriptive statistics", "python-worker")
        : request;
    var task = repository.enqueueResearchAnalysisTask(cohortId, normalized);
    repository.audit("research_demo", "RESEARCH_ANALYSIS_TASK_QUEUED", task.taskId(), task.scriptVersion());
    return task;
  }

  @PostMapping("/research/analysis-tasks/{taskId}/mark-failed")
  public ResearchAnalysisTaskSummary markAnalysisTaskFailed(@PathVariable String taskId, @RequestBody(required = false) ResearchTaskFailureRequest request) {
    String message = request == null || request.errorMessage() == null || request.errorMessage().isBlank()
        ? "research analysis task failed"
        : request.errorMessage();
    var task = repository.markResearchAnalysisTaskFailure(taskId, message);
    repository.audit("research_worker", "RESEARCH_ANALYSIS_TASK_FAILED", taskId, message);
    return task;
  }

  @PostMapping("/research/cohorts/{cohortId}/analysis-runs")
  public ResearchAnalysisRunSummary runAnalysis(@PathVariable String cohortId, @RequestBody(required = false) ResearchAnalysisRunRequest request) {
    ResearchAnalysisRunRequest normalized = request == null
        ? new ResearchAnalysisRunRequest("fixed-cap-statistics.v1", "CAP cohort descriptive statistics", "python-worker")
        : request;
    var run = repository.runResearchAnalysis(cohortId, normalized);
    repository.audit("research_demo", "RESEARCH_ANALYSIS_COMPLETED", run.runId(), run.outputHash());
    return run;
  }

  @GetMapping("/research/cohorts/{cohortId}/exports")
  public List<ResearchExportSummary> exports(@PathVariable String cohortId) {
    return repository.exports(cohortId);
  }

  @PostMapping("/research/cohorts/{cohortId}/exports")
  public ResearchExportSummary createExport(@PathVariable String cohortId, @RequestBody(required = false) ResearchExportRequest request) {
    ResearchExportRequest normalized = request == null
        ? new ResearchExportRequest("research_demo", "research-review")
        : request;
    var export = repository.createDeidentifiedExport(cohortId, normalized);
    repository.audit("research_demo", "RESEARCH_DEIDENTIFIED_EXPORT_CREATED", export.exportId(), export.dataHash());
    return export;
  }

  @GetMapping("/research/artifacts")
  public ResearchArtifactContent researchArtifact(@RequestParam String uri) {
    return repository.readArtifact(uri);
  }

  @GetMapping("/research/cohorts/{cohortId}/reports")
  public List<ResearchReportDraftSummary> reportDrafts(@PathVariable String cohortId) {
    return repository.reportDrafts(cohortId);
  }

  @PostMapping("/research/cohorts/{cohortId}/reports")
  public ResearchReportDraftSummary createReportDraft(@PathVariable String cohortId) {
    var report = repository.createReportDraft(cohortId);
    repository.audit("research_demo", "RESEARCH_REPORT_DRAFT_CREATED", report.reportId(), report.title());
    return report;
  }

  @PostMapping("/research/reports/{reportId}/review")
  public ResearchReportDraftSummary reviewReport(@PathVariable String reportId, @RequestBody ResearchReportReviewRequest request) {
    if (request == null || request.reviewNote() == null || request.reviewNote().isBlank()) {
      throw new IllegalArgumentException("reviewNote is required");
    }
    var report = repository.reviewReport(reportId, request.reviewNote());
    repository.audit("research_demo", "RESEARCH_REPORT_REVIEWED", reportId, request.reviewNote());
    return report;
  }

  @GetMapping("/knowledge/submissions")
  public List<KnowledgeSubmissionSummary> knowledgeSubmissions(@RequestParam(required = false) String status) {
    return repository.knowledgeSubmissions(status);
  }

  @PostMapping("/knowledge/submissions")
  public KnowledgeSubmissionSummary submitKnowledge(@RequestBody KnowledgeSubmissionRequest request) {
    var submission = repository.submitKnowledge(request);
    repository.audit("knowledge_demo", "KNOWLEDGE_SUBMITTED", submission.submissionId(), submission.status());
    return submission;
  }

  @PostMapping("/knowledge/submissions/{submissionId}/reviews")
  public KnowledgeReviewSummary reviewKnowledge(@PathVariable String submissionId, @RequestBody KnowledgeReviewRequest request) {
    var review = repository.reviewKnowledge(submissionId, request);
    repository.audit("knowledge_demo", "KNOWLEDGE_REVIEW_RECORDED", submissionId, review.reviewerRole() + ":" + review.decision());
    return review;
  }

  @PostMapping("/knowledge/submissions/{submissionId}/withdraw")
  public KnowledgeSubmissionSummary withdrawKnowledge(@PathVariable String submissionId, @RequestBody(required = false) Map<String, String> request) {
    String reason = request == null ? "withdrawn" : request.getOrDefault("reason", "withdrawn");
    return repository.withdrawKnowledge(submissionId, reason);
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
