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
  public record SafetyAlert(String ruleId, String version, String status, String level, String message, List<String> facts, boolean blocking) {}
  public record EvidenceSnippet(String evidenceId, String title, String status, String version, String effectiveDate, String locator, String text, double score) {}
  public record CandidatePlan(String candidateId, String name, List<String> drugCodes, String regimen, String reason, String difference, List<String> risks, List<String> monitoring, List<EvidenceSnippet> evidence, List<String> excludedDrugs, boolean blocked) {}
  public record StageState(String name, String status, long elapsedMs, String detail) {}
  public record WorkbenchPayload(PatientProfile patient, Encounter encounter, List<Fact> facts, List<SafetyAlert> alerts, List<CandidatePlan> candidates, List<String> missingInfo, List<StageState> stages, String recommendationId, String aiStatus) {}
  public record DecisionRequest(String action, String candidateId, String reason, String modifiedRegimen, Map<String, Object> riskHandling) {}
  public record DecisionResponse(String decisionId, String action, String prescriptionDraftId, String draftStatus, List<String> auditEvents, boolean blocked) {}
  public record SnapshotImportRequest(String sourceSystem, String sourceBatchId, Map<String, Object> payload) {}
  public record SnapshotImportResponse(String eventId, String status, String schemaVersion, int patientsUpserted, int encountersUpserted, int catalogItemsUpserted, int mappingsUpserted, List<String> warnings) {}
}
