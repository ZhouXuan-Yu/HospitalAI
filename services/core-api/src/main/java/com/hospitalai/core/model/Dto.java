package com.hospitalai.core.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class Dto {
  private Dto() {}

  public record PatientProfile(String patientId, String displayName, String sex, int age, String source, String sourcePatientId) {}
  public record Encounter(String encounterId, String patientId, String department, String diagnosis, int dataVersion, String scenario) {}
  public record WorklistItem(String encounterId, String patientId, String displayName, String sex, int age, String department, String diagnosis, int dataVersion, String scenario, Instant admittedAt, String sourcePatientId) {}
  public record Fact(String type, String label, String value, String source, String sourceId, Instant collectedAt, String missingStatus) {}
  public record ClinicalRuleSummary(String ruleId, String version, String name, String status, String severity, String basis, String deterministicHandler, Instant publishedAt) {}
  public record ClinicalRuleCaseSummary(String caseId, String ruleId, String ruleVersion, String title, String inputRef, String expectedResult, String status) {}
  public record RuleGovernancePayload(List<ClinicalRuleSummary> rules, List<ClinicalRuleCaseSummary> cases) {}
  public record RuleUpsertRequest(String ruleId, String version, String name, String severity, String basis, String deterministicHandler) {}
  public record RuleLifecycleResponse(String ruleId, String version, String status, String auditEvent) {}
  public record DoseRequest(String drugCode, String indication, String patientGroup, boolean renalFunctionMissing) {}
  public record DoseResponse(String drugCode, String indication, String patientGroup, String status, String regimenText, String ruleVersion, String evidenceId, List<String> warnings) {}
  public record EvidenceDocumentSummary(String evidenceId, String title, String status, String version, String effectiveDate, String scope, String locator) {}
  public record EvidenceDocumentRequest(String evidenceId, String title, String version, String effectiveDate, String scope, String locator, String text) {}
  public record EvidenceParseRequest(String parserVersion, String blockType) {}
  public record EvidenceLifecycleResponse(String evidenceId, String status, String auditEvent, int blockCount, int chunkCount) {}
  public record EvidenceChunkSummary(String chunkId, String evidenceId, String title, String status, String version, String effectiveDate, String locator, String chunkText, String keywords) {}
  public record SafetyAlert(String ruleId, String version, String status, String level, String message, List<String> facts, boolean blocking) {}
  public record EvidenceSnippet(String evidenceId, String title, String status, String version, String effectiveDate, String locator, String text, double score) {}
  public record CandidatePlan(String candidateId, String name, List<String> drugCodes, String regimen, String reason, String difference, List<String> risks, List<String> monitoring, List<EvidenceSnippet> evidence, List<String> excludedDrugs, boolean blocked) {}
  public record StageState(String name, String status, long elapsedMs, String detail) {}
  public record WorkbenchPayload(PatientProfile patient, Encounter encounter, List<Fact> facts, List<SafetyAlert> alerts, List<CandidatePlan> candidates, List<String> missingInfo, List<StageState> stages, String recommendationId, String aiStatus) {}
  public record DecisionRequest(String action, String candidateId, String reason, String modifiedRegimen, Map<String, Object> riskHandling) {}
  public record DecisionResponse(String decisionId, String action, String prescriptionDraftId, String draftStatus, String recommendationStatus, String pharmacistReviewId, List<String> auditEvents, boolean blocked) {}
  public record RecommendationSnapshotSummary(String recommendationId, String encounterId, String patientId, int dataVersion, String status, int candidateCount, int blockingCount, int strongAlertCount, Instant generatedAt, Instant expiredAt) {}
  public record PharmacistReviewTaskSummary(String reviewId, String recommendationId, String decisionId, String encounterId, String status, String priority, String reason, String assignedRole, Instant createdAt, Instant resolvedAt, String resolution) {}
  public record PharmacistReviewResolutionRequest(String resolution) {}
  public record CollaborationTaskSummary(String taskId, String recommendationId, String encounterId, String sourceDepartment, String targetDepartment, String status, String reason, Instant createdAt, Instant resolvedAt, String resolution) {}
  public record CollaborationResolutionRequest(String resolution) {}
  public record PrescriptionDraftCallbackRequest(String hisStatus, String hisMessage) {}
  public record PrescriptionDraftStatus(String draftId, String decisionId, String encounterId, String status, String hisStatus, String hisMessage, Instant callbackAt) {}
  public record PrescriptionDraftWriteTaskSummary(String taskId, String draftId, String status, int attemptCount, Instant nextAttemptAt, String lastError, Instant updatedAt) {}
  public record DraftRetryRequest(String errorMessage) {}
  public record TimelineEventRequest(String patientId, String encounterId, String eventType, String drugCode, String drugName, String sourceSystem, String sourceId, String detail) {}
  public record TimelineEventSummary(String eventId, String patientId, String encounterId, String eventType, String drugCode, String drugName, Instant eventTime, String sourceSystem, String sourceId, String detail) {}
  public record MedicationFeedbackRequest(String patientId, String encounterId, String drugCode, String effectiveness, String adverseSignal, String reporterRole, String note) {}
  public record MedicationFeedbackSummary(String feedbackId, String patientId, String encounterId, String drugCode, String effectiveness, String adverseSignal, String reporterRole, String note, Instant recordedAt) {}
  public record DischargeOutcomeRequest(String patientId, String encounterId, String outcomeStatus, String readmissionRisk, boolean followupRequired, String note) {}
  public record DischargeOutcomeSummary(String outcomeId, String patientId, String encounterId, String outcomeStatus, String readmissionRisk, boolean followupRequired, String note, Instant recordedAt) {}
  public record ResearchCohortRequest(String cohortId, String name, String diseaseScope, String inclusionCriteria, String exclusionCriteria) {}
  public record ResearchVariableRequest(String variableId, String name, String definition, String sourceTable, String missingPolicy, String version) {}
  public record ResearchCohortSummary(String cohortId, String name, String diseaseScope, String inclusionCriteria, String exclusionCriteria, String status, Instant createdAt, Instant frozenAt) {}
  public record ResearchVariableSummary(String variableId, String cohortId, String name, String definition, String sourceTable, String missingPolicy, String version) {}
  public record ResearchQualityCheckSummary(String checkId, String cohortId, String status, int totalSubjects, String missingSummary, String issueSummary, Instant checkedAt) {}
  public record ResearchReportDraftSummary(String reportId, String cohortId, String status, String title, String markdownBody, Instant generatedAt, Instant reviewedAt, String reviewNote) {}
  public record ResearchReportReviewRequest(String reviewNote) {}
  public record SnapshotImportRequest(String sourceSystem, String sourceBatchId, Map<String, Object> payload) {}
  public record SnapshotImportResponse(String eventId, String status, String schemaVersion, int patientsUpserted, int encountersUpserted, int catalogItemsUpserted, int mappingsUpserted, List<String> warnings) {}
}
