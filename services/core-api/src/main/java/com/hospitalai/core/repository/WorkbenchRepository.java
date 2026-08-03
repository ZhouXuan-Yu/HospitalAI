package com.hospitalai.core.repository;

import com.hospitalai.core.model.Dto.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WorkbenchRepository {
  private final JdbcTemplate jdbc;

  public WorkbenchRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public PatientProfile patientForEncounter(String encounterId) {
    return jdbc.queryForObject("""
        SELECT p.patient_id, p.display_name, p.sex, p.age, p.his_patient_id
        FROM patients p JOIN encounters e ON e.patient_id = p.patient_id
        WHERE e.encounter_id = ?
        """, (rs, row) -> new PatientProfile(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4), "HIS_SIMULATOR", rs.getString(5)), encounterId);
  }

  public Encounter encounter(String encounterId) {
    return jdbc.queryForObject("SELECT encounter_id, patient_id, department, diagnosis, data_version, scenario FROM encounters WHERE encounter_id = ?",
        (rs, row) -> new Encounter(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getInt(5), rs.getString(6)), encounterId);
  }

  public List<WorklistItem> worklist() {
    return jdbc.query("""
        SELECT e.encounter_id, p.patient_id, p.display_name, p.sex, p.age, e.department, e.diagnosis,
               e.data_version, e.scenario, e.admitted_at, p.his_patient_id
        FROM encounters e JOIN patients p ON p.patient_id = e.patient_id
        ORDER BY e.admitted_at DESC, e.encounter_id
        """, (rs, row) -> new WorklistItem(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getInt(5),
        rs.getString(6),
        rs.getString(7),
        rs.getInt(8),
        rs.getString(9),
        rs.getTimestamp(10).toInstant(),
        rs.getString(11)));
  }

  public List<Fact> facts(String encounterId, String patientId) {
    var rows = new java.util.ArrayList<Fact>();
    rows.addAll(jdbc.query("SELECT name, status, source_id, collected_at FROM diagnosis WHERE encounter_id = ?",
        (rs, row) -> new Fact("diagnosis", "诊断", rs.getString(1) + " / " + rs.getString(2), "HIS_SIMULATOR", rs.getString(3), rs.getTimestamp(4).toInstant(), "present"), encounterId));
    rows.addAll(jdbc.query("SELECT name, COALESCE(lab_value,'未知'), unit, missing_status, source_id, collected_at FROM lab_result WHERE encounter_id = ? ORDER BY code",
        (rs, row) -> new Fact("lab", rs.getString(1), rs.getString(2) + " " + rs.getString(3), "LIS_SIMULATOR", rs.getString(5), rs.getTimestamp(6).toInstant(), rs.getString(4)), encounterId));
    rows.addAll(jdbc.query("SELECT drug_name, status, severity, source_id, confirmed_at FROM allergy_event WHERE patient_id = ?",
        (rs, row) -> new Fact("allergy", "确认过敏", rs.getString(1) + " / " + rs.getString(2) + " / " + rs.getString(3), "HIS_SIMULATOR", rs.getString(4), rs.getTimestamp(5).toInstant(), "present"), patientId));
    rows.addAll(jdbc.query("SELECT drug_name, review_status, severity, source_id, reviewed_at FROM adverse_drug_reaction WHERE patient_id = ?",
        (rs, row) -> new Fact("adr", "严重不良反应", rs.getString(1) + " / " + rs.getString(2) + " / " + rs.getString(3), "PHARMACY_REVIEW", rs.getString(4), rs.getTimestamp(5).toInstant(), "present"), patientId));
    rows.addAll(jdbc.query("SELECT drug_name, department, status, source_id, updated_at FROM medication_order WHERE patient_id = ? AND status = 'active'",
        (rs, row) -> new Fact("currentMedication", "当前有效用药", rs.getString(1) + " / " + rs.getString(2) + " / " + rs.getString(3), "HIS_SIMULATOR", rs.getString(4), rs.getTimestamp(5).toInstant(), "present"), patientId));
    return rows;
  }

  public List<Map<String, Object>> activeCatalog() {
    return jdbc.queryForList("SELECT drug_code, name, pharmacology_class FROM drug_catalog WHERE status = 'active' ORDER BY drug_code");
  }

  public List<Map<String, Object>> confirmedAllergies(String patientId) {
    return jdbc.queryForList("SELECT drug_code, drug_name, severity, source_id FROM allergy_event WHERE patient_id = ? AND status = 'confirmed'", patientId);
  }

  public List<Map<String, Object>> severeAdrs(String patientId) {
    return jdbc.queryForList("SELECT drug_code, drug_name, severity, source_id FROM adverse_drug_reaction WHERE patient_id = ? AND severity = 'severe' AND review_status = 'reviewed'", patientId);
  }

  public List<Map<String, Object>> activeOrders(String patientId) {
    return jdbc.queryForList("SELECT drug_code, drug_name, pharmacology_class, department, source_id FROM medication_order WHERE patient_id = ? AND status = 'active'", patientId);
  }

  public List<Map<String, Object>> missingLabs(String encounterId) {
    return jdbc.queryForList("SELECT code, name, source_id FROM lab_result WHERE encounter_id = ? AND missing_status <> 'present'", encounterId);
  }

  public List<ClinicalRuleSummary> clinicalRules() {
    return jdbc.query("""
        SELECT rule_id, version, name, status, severity, basis, deterministic_handler, published_at
        FROM clinical_rule
        ORDER BY rule_id, version
        """, (rs, row) -> new ClinicalRuleSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getString(7),
        rs.getTimestamp(8) == null ? null : rs.getTimestamp(8).toInstant()));
  }

  public List<ClinicalRuleCaseSummary> clinicalRuleCases() {
    return jdbc.query("""
        SELECT case_id, rule_id, rule_version, title, input_ref, expected_result, status
        FROM clinical_rule_case
        ORDER BY case_id
        """, (rs, row) -> new ClinicalRuleCaseSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getString(7)));
  }

  public ClinicalRuleSummary rule(String ruleId) {
    var rules = jdbc.query("""
        SELECT rule_id, version, name, status, severity, basis, deterministic_handler, published_at
        FROM clinical_rule
        WHERE rule_id = ? AND status LIKE 'published%'
        ORDER BY published_at DESC
        LIMIT 1
        """, (rs, row) -> new ClinicalRuleSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getString(7),
        rs.getTimestamp(8) == null ? null : rs.getTimestamp(8).toInstant()), ruleId);
    if (rules.isEmpty()) {
      throw new IllegalStateException("published rule not found: " + ruleId);
    }
    return rules.get(0);
  }

  public void upsertRuleDraft(RuleUpsertRequest request) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM clinical_rule WHERE rule_id = ? AND version = ?
        """, Integer.class, request.ruleId(), request.version());
    if (count != null && count > 0) {
      jdbc.update("""
          UPDATE clinical_rule
          SET name = ?, severity = ?, basis = ?, deterministic_handler = ?, status = 'draft', published_at = NULL
          WHERE rule_id = ? AND version = ?
          """, request.name(), request.severity(), request.basis(), request.deterministicHandler(), request.ruleId(), request.version());
    } else {
      jdbc.update("""
          INSERT INTO clinical_rule(rule_id, version, name, status, severity, basis, deterministic_handler, published_at)
          VALUES (?, ?, ?, 'draft', ?, ?, ?, NULL)
          """, request.ruleId(), request.version(), request.name(), request.severity(), request.basis(), request.deterministicHandler());
    }
  }

  public void updateRuleStatus(String ruleId, String version, String status, boolean setPublishedAt) {
    int updated = jdbc.update("""
        UPDATE clinical_rule
        SET status = ?, published_at = CASE WHEN ? THEN ? ELSE published_at END
        WHERE rule_id = ? AND version = ?
        """, status, setPublishedAt, Instant.now(), ruleId, version);
    if (updated == 0) {
      throw new IllegalArgumentException("clinical rule not found: " + ruleId + "@" + version);
    }
  }

  public void insertRuleExecution(String recommendationId, String encounterId, SafetyAlert alert) {
    jdbc.update("""
        INSERT INTO rule_execution(execution_id, recommendation_id, encounter_id, rule_id, rule_version, result_level, blocked, matched_facts, message, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, "REX-" + UUID.randomUUID(), recommendationId, encounterId, alert.ruleId(), alert.version(), alert.level(), alert.blocking(), String.join(",", alert.facts()), alert.message(), Instant.now());
  }

  public void upsertRecommendationSnapshot(String recommendationId, String encounterId, String patientId, int dataVersion, String status, int candidateCount, int blockingCount, int strongAlertCount) {
    jdbc.update("""
        UPDATE recommendation_snapshot
        SET status = 'expired', expired_at = ?
        WHERE encounter_id = ? AND recommendation_id <> ? AND data_version < ? AND status <> 'expired'
        """, Instant.now(), encounterId, recommendationId, dataVersion);
    if (exists("recommendation_snapshot", "recommendation_id", recommendationId)) {
      jdbc.update("""
          UPDATE recommendation_snapshot
          SET status = ?, candidate_count = ?, blocking_count = ?, strong_alert_count = ?
          WHERE recommendation_id = ?
          """, status, candidateCount, blockingCount, strongAlertCount, recommendationId);
    } else {
      jdbc.update("""
          INSERT INTO recommendation_snapshot(recommendation_id, encounter_id, patient_id, data_version, status, candidate_count, blocking_count, strong_alert_count, generated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          """, recommendationId, encounterId, patientId, dataVersion, status, candidateCount, blockingCount, strongAlertCount, Instant.now());
    }
  }

  public void updateRecommendationStatus(String recommendationId, String status) {
    jdbc.update("UPDATE recommendation_snapshot SET status = ?, expired_at = CASE WHEN ? = 'expired' THEN ? ELSE expired_at END WHERE recommendation_id = ?",
        status, status, Instant.now(), recommendationId);
  }

  public List<RecommendationSnapshotSummary> recommendationSnapshots() {
    return jdbc.query("""
        SELECT recommendation_id, encounter_id, patient_id, data_version, status, candidate_count, blocking_count, strong_alert_count, generated_at, expired_at
        FROM recommendation_snapshot
        ORDER BY generated_at DESC
        """, (rs, row) -> new RecommendationSnapshotSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getInt(4),
        rs.getString(5),
        rs.getInt(6),
        rs.getInt(7),
        rs.getInt(8),
        rs.getTimestamp(9).toInstant(),
        rs.getTimestamp(10) == null ? null : rs.getTimestamp(10).toInstant()));
  }

  public String createPharmacistReviewTask(String recommendationId, String decisionId, String encounterId, String priority, String reason) {
    String reviewId = "REV-" + UUID.randomUUID();
    jdbc.update("""
        INSERT INTO pharmacist_review_task(review_id, recommendation_id, decision_id, encounter_id, status, priority, reason, assigned_role, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, 'pharmacist', ?)
        """, reviewId, recommendationId, decisionId, encounterId, priority, reason, Instant.now());
    return reviewId;
  }

  public String createCollaborationTask(String recommendationId, String encounterId, String sourceDepartment, String targetDepartment, String reason) {
    String taskId = "COL-" + UUID.randomUUID();
    jdbc.update("""
        INSERT INTO collaboration_task(task_id, recommendation_id, encounter_id, source_department, target_department, status, reason, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        """, taskId, recommendationId, encounterId, sourceDepartment, targetDepartment, reason, Instant.now());
    return taskId;
  }

  public List<CollaborationTaskSummary> collaborationTasks(String status) {
    String sql = """
        SELECT task_id, recommendation_id, encounter_id, source_department, target_department, status, reason, created_at, resolved_at, resolution
        FROM collaboration_task
        """;
    Object[] args = new Object[] {};
    if (status != null && !status.isBlank()) {
      sql += " WHERE status = ?";
      args = new Object[] { status };
    }
    sql += " ORDER BY created_at DESC";
    return jdbc.query(sql, (rs, row) -> new CollaborationTaskSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getString(7),
        rs.getTimestamp(8).toInstant(),
        rs.getTimestamp(9) == null ? null : rs.getTimestamp(9).toInstant(),
        rs.getString(10)), args);
  }

  public void resolveCollaborationTask(String taskId, String resolution) {
    int updated = jdbc.update("""
        UPDATE collaboration_task
        SET status = 'resolved', resolved_at = ?, resolution = ?
        WHERE task_id = ? AND status = 'pending'
        """, Instant.now(), resolution, taskId);
    if (updated == 0) {
      throw new IllegalArgumentException("pending collaboration task not found: " + taskId);
    }
  }

  public List<PharmacistReviewTaskSummary> pharmacistReviews(String status) {
    String sql = """
        SELECT review_id, recommendation_id, decision_id, encounter_id, status, priority, reason, assigned_role, created_at, resolved_at, resolution
        FROM pharmacist_review_task
        """;
    Object[] args = new Object[] {};
    if (status != null && !status.isBlank()) {
      sql += " WHERE status = ?";
      args = new Object[] { status };
    }
    sql += " ORDER BY created_at DESC";
    return jdbc.query(sql, (rs, row) -> new PharmacistReviewTaskSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getString(7),
        rs.getString(8),
        rs.getTimestamp(9).toInstant(),
        rs.getTimestamp(10) == null ? null : rs.getTimestamp(10).toInstant(),
        rs.getString(11)), args);
  }

  public void resolvePharmacistReview(String reviewId, String resolution) {
    int updated = jdbc.update("""
        UPDATE pharmacist_review_task
        SET status = 'resolved', resolved_at = ?, resolution = ?
        WHERE review_id = ? AND status = 'pending'
        """, Instant.now(), resolution, reviewId);
    if (updated == 0) {
      throw new IllegalArgumentException("pending pharmacist review not found: " + reviewId);
    }
  }

  public List<Map<String, Object>> doseRules(String drugCode, String indication, String patientGroup) {
    return jdbc.queryForList("""
        SELECT dose_rule_id, drug_code, indication, patient_group, renal_adjustment_required, regimen_text, status, evidence_id, version
        FROM dose_rule
        WHERE drug_code = ? AND indication = ? AND patient_group = ? AND status = 'published'
        ORDER BY updated_at DESC
        LIMIT 1
        """, drugCode, indication, patientGroup);
  }

  public List<EvidenceChunkSummary> publishedEvidenceChunks(String query) {
    String pattern = "%" + query + "%";
    return jdbc.query("""
        SELECT c.chunk_id, d.evidence_id, d.title, d.status, d.version, d.effective_date, d.locator, c.chunk_text, c.keywords
        FROM evidence_chunk c JOIN evidence_document d ON d.evidence_id = c.evidence_id
        WHERE c.status = 'published' AND d.status = 'published'
          AND (c.keywords LIKE ? OR c.chunk_text LIKE ? OR d.scope LIKE ? OR d.title LIKE ?)
        ORDER BY d.effective_date DESC, c.chunk_id
        """, (rs, row) -> new EvidenceChunkSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getDate(6).toString(),
        rs.getString(7),
        rs.getString(8),
        rs.getString(9)), pattern, pattern, pattern, pattern);
  }

  public List<EvidenceDocumentSummary> evidenceDocuments() {
    return jdbc.query("""
        SELECT evidence_id, title, status, version, effective_date, scope, locator
        FROM evidence_document
        ORDER BY effective_date DESC, evidence_id
        """, (rs, row) -> new EvidenceDocumentSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getDate(5).toString(),
        rs.getString(6),
        rs.getString(7)));
  }

  public void upsertEvidenceDocument(EvidenceDocumentRequest request, String status) {
    if (exists("evidence_document", "evidence_id", request.evidenceId())) {
      jdbc.update("""
          UPDATE evidence_document
          SET title = ?, status = ?, version = ?, effective_date = ?, scope = ?, locator = ?, text = ?
          WHERE evidence_id = ?
          """, request.title(), status, request.version(), request.effectiveDate(), request.scope(), request.locator(), request.text(), request.evidenceId());
    } else {
      jdbc.update("""
          INSERT INTO evidence_document(evidence_id, title, status, version, effective_date, scope, locator, text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          """, request.evidenceId(), request.title(), status, request.version(), request.effectiveDate(), request.scope(), request.locator(), request.text());
    }
  }

  public void updateEvidenceStatus(String evidenceId, String status) {
    int updated = jdbc.update("UPDATE evidence_document SET status = ? WHERE evidence_id = ?", status, evidenceId);
    if (updated == 0) {
      throw new IllegalArgumentException("evidence document not found: " + evidenceId);
    }
    jdbc.update("UPDATE evidence_chunk SET status = ? WHERE evidence_id = ?", status, evidenceId);
  }

  public String evidenceText(String evidenceId) {
    var values = jdbc.query("SELECT text FROM evidence_document WHERE evidence_id = ?", rs -> rs.next() ? rs.getString(1) : null, evidenceId);
    if (values == null) {
      throw new IllegalArgumentException("evidence document not found: " + evidenceId);
    }
    return values;
  }

  public int replaceEvidenceBlocksAndChunks(String evidenceId, String blockType, List<String> blockTexts, String chunkStatus) {
    jdbc.update("DELETE FROM evidence_chunk WHERE evidence_id = ?", evidenceId);
    jdbc.update("DELETE FROM document_block WHERE evidence_id = ?", evidenceId);
    int count = 0;
    for (int i = 0; i < blockTexts.size(); i++) {
      String text = blockTexts.get(i);
      String blockId = evidenceId + "-B" + (i + 1);
      String chunkId = evidenceId + "-C" + (i + 1);
      jdbc.update("""
          INSERT INTO document_block(block_id, evidence_id, block_type, page_label, sort_order, text)
          VALUES (?, ?, ?, ?, ?, ?)
          """, blockId, evidenceId, blockType, "auto-" + (i + 1), i + 1, text);
      jdbc.update("""
          INSERT INTO evidence_chunk(chunk_id, evidence_id, block_id, chunk_text, keywords, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          """, chunkId, evidenceId, blockId, text, keywords(text), chunkStatus, Instant.now());
      count++;
    }
    return count;
  }

  private static String keywords(String text) {
    return text.replaceAll("[，。；、\\s]+", ",");
  }

  public void insertDecision(String decisionId, String recommendationId, String encounterId, DecisionRequest request, String actor, String modifiedDiffJson) {
    jdbc.update("""
        INSERT INTO recommendation_decision(decision_id, recommendation_id, encounter_id, candidate_id, action, original_version, modified_regimen, modified_diff_json, reason, actor, created_at)
        VALUES (?, ?, ?, ?, ?, 'candidate.v1', ?, ?, ?, ?, ?)
        """, decisionId, recommendationId, encounterId, request.candidateId(), request.action(), request.modifiedRegimen(), modifiedDiffJson, request.reason(), actor, Instant.now());
  }

  public String insertDraft(String decisionId, String encounterId, String idempotencyKey) {
    var existing = draftByIdempotencyKey(idempotencyKey);
    if (existing != null) {
      return existing.get("draft_id").toString();
    }
    var draftId = "DRAFT-" + UUID.randomUUID();
    jdbc.update("INSERT INTO prescription_draft(draft_id, decision_id, encounter_id, status, idempotency_key, created_at) VALUES (?, ?, ?, 'draft_written', ?, ?)",
        draftId, decisionId, encounterId, idempotencyKey, Instant.now());
    createDraftWriteTask(draftId);
    return draftId;
  }

  public void createDraftWriteTask(String draftId) {
    jdbc.update("""
        INSERT INTO prescription_draft_write_task(task_id, draft_id, status, attempt_count, next_attempt_at, created_at, updated_at)
        VALUES (?, ?, 'pending', 0, ?, ?, ?)
        """, "DWT-" + UUID.randomUUID(), draftId, Instant.now(), Instant.now(), Instant.now());
  }

  public Map<String, Object> draftByIdempotencyKey(String idempotencyKey) {
    var rows = jdbc.queryForList("SELECT draft_id, status FROM prescription_draft WHERE idempotency_key = ?", idempotencyKey);
    return rows.isEmpty() ? null : rows.get(0);
  }

  public PrescriptionDraftStatus draft(String draftId) {
    return jdbc.queryForObject("""
        SELECT draft_id, decision_id, encounter_id, status, his_status, his_message, callback_at
        FROM prescription_draft
        WHERE draft_id = ?
        """, (rs, row) -> new PrescriptionDraftStatus(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getString(4),
        rs.getString(5),
        rs.getString(6),
        rs.getTimestamp(7) == null ? null : rs.getTimestamp(7).toInstant()), draftId);
  }

  public void updateDraftCallback(String draftId, String status, String hisStatus, String hisMessage) {
    int updated = jdbc.update("""
        UPDATE prescription_draft
        SET status = ?, his_status = ?, his_message = ?, callback_at = ?
        WHERE draft_id = ?
        """, status, hisStatus, hisMessage, Instant.now(), draftId);
    if (updated == 0) {
      throw new IllegalArgumentException("prescription draft not found: " + draftId);
    }
  }

  public List<PrescriptionDraftWriteTaskSummary> draftWriteTasks(String status) {
    String sql = """
        SELECT task_id, draft_id, status, attempt_count, next_attempt_at, last_error, updated_at
        FROM prescription_draft_write_task
        """;
    Object[] args = new Object[] {};
    if (status != null && !status.isBlank()) {
      sql += " WHERE status = ?";
      args = new Object[] { status };
    }
    sql += " ORDER BY updated_at DESC";
    return jdbc.query(sql, (rs, row) -> new PrescriptionDraftWriteTaskSummary(
        rs.getString(1),
        rs.getString(2),
        rs.getString(3),
        rs.getInt(4),
        rs.getTimestamp(5).toInstant(),
        rs.getString(6),
        rs.getTimestamp(7).toInstant()), args);
  }

  public void markDraftWriteTaskFailure(String taskId, String errorMessage) {
    int updated = jdbc.update("""
        UPDATE prescription_draft_write_task
        SET status = CASE WHEN attempt_count + 1 >= 3 THEN 'dead_letter' ELSE 'retry_waiting' END,
            attempt_count = attempt_count + 1,
            next_attempt_at = ?,
            last_error = ?,
            updated_at = ?
        WHERE task_id = ?
        """, Instant.now().plusSeconds(60), errorMessage, Instant.now(), taskId);
    if (updated == 0) {
      throw new IllegalArgumentException("draft write task not found: " + taskId);
    }
  }

  public void markDraftWriteTaskWritten(String draftId) {
    jdbc.update("""
        UPDATE prescription_draft_write_task
        SET status = 'written', updated_at = ?
        WHERE draft_id = ? AND status <> 'written'
        """, Instant.now(), draftId);
  }

  public TimelineEventSummary insertTimelineEvent(TimelineEventRequest request) {
    String eventId = "TLE-" + UUID.randomUUID();
    Instant now = Instant.now();
    jdbc.update("""
        INSERT INTO medication_timeline_event(event_id, patient_id, encounter_id, event_type, drug_code, drug_name, event_time, source_system, source_id, detail)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, eventId, request.patientId(), request.encounterId(), request.eventType(), request.drugCode(), request.drugName(), now, request.sourceSystem(), request.sourceId(), request.detail());
    return new TimelineEventSummary(eventId, request.patientId(), request.encounterId(), request.eventType(), request.drugCode(), request.drugName(), now, request.sourceSystem(), request.sourceId(), request.detail());
  }

  public List<TimelineEventSummary> timeline(String patientId) {
    return jdbc.query("""
        SELECT event_id, patient_id, encounter_id, event_type, drug_code, drug_name, event_time, source_system, source_id, detail
        FROM medication_timeline_event
        WHERE patient_id = ?
        ORDER BY event_time DESC
        """, (rs, row) -> new TimelineEventSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
        rs.getTimestamp(7).toInstant(), rs.getString(8), rs.getString(9), rs.getString(10)), patientId);
  }

  public MedicationFeedbackSummary insertFeedback(MedicationFeedbackRequest request) {
    String feedbackId = "FDB-" + UUID.randomUUID();
    Instant now = Instant.now();
    jdbc.update("""
        INSERT INTO medication_feedback(feedback_id, patient_id, encounter_id, drug_code, effectiveness, adverse_signal, reporter_role, note, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, feedbackId, request.patientId(), request.encounterId(), request.drugCode(), request.effectiveness(), request.adverseSignal(), request.reporterRole(), request.note(), now);
    return new MedicationFeedbackSummary(feedbackId, request.patientId(), request.encounterId(), request.drugCode(), request.effectiveness(), request.adverseSignal(), request.reporterRole(), request.note(), now);
  }

  public List<MedicationFeedbackSummary> feedback(String patientId) {
    return jdbc.query("""
        SELECT feedback_id, patient_id, encounter_id, drug_code, effectiveness, adverse_signal, reporter_role, note, recorded_at
        FROM medication_feedback
        WHERE patient_id = ?
        ORDER BY recorded_at DESC
        """, (rs, row) -> new MedicationFeedbackSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
        rs.getString(7), rs.getString(8), rs.getTimestamp(9).toInstant()), patientId);
  }

  public DischargeOutcomeSummary insertDischargeOutcome(DischargeOutcomeRequest request) {
    String outcomeId = "OUT-" + UUID.randomUUID();
    Instant now = Instant.now();
    jdbc.update("""
        INSERT INTO discharge_outcome(outcome_id, patient_id, encounter_id, outcome_status, readmission_risk, followup_required, note, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, outcomeId, request.patientId(), request.encounterId(), request.outcomeStatus(), request.readmissionRisk(), request.followupRequired(), request.note(), now);
    return new DischargeOutcomeSummary(outcomeId, request.patientId(), request.encounterId(), request.outcomeStatus(), request.readmissionRisk(), request.followupRequired(), request.note(), now);
  }

  public List<DischargeOutcomeSummary> dischargeOutcomes(String patientId) {
    return jdbc.query("""
        SELECT outcome_id, patient_id, encounter_id, outcome_status, readmission_risk, followup_required, note, recorded_at
        FROM discharge_outcome
        WHERE patient_id = ?
        ORDER BY recorded_at DESC
        """, (rs, row) -> new DischargeOutcomeSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
        rs.getBoolean(6), rs.getString(7), rs.getTimestamp(8).toInstant()), patientId);
  }

  public ResearchCohortSummary upsertCohort(ResearchCohortRequest request) {
    Instant now = Instant.now();
    if (exists("research_cohort", "cohort_id", request.cohortId())) {
      jdbc.update("""
          UPDATE research_cohort
          SET name = ?, disease_scope = ?, inclusion_criteria = ?, exclusion_criteria = ?, status = 'draft'
          WHERE cohort_id = ?
          """, request.name(), request.diseaseScope(), request.inclusionCriteria(), request.exclusionCriteria(), request.cohortId());
    } else {
      jdbc.update("""
          INSERT INTO research_cohort(cohort_id, name, disease_scope, inclusion_criteria, exclusion_criteria, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'draft', ?)
          """, request.cohortId(), request.name(), request.diseaseScope(), request.inclusionCriteria(), request.exclusionCriteria(), now);
    }
    return cohort(request.cohortId());
  }

  public ResearchCohortSummary cohort(String cohortId) {
    return jdbc.queryForObject("""
        SELECT cohort_id, name, disease_scope, inclusion_criteria, exclusion_criteria, status, created_at, frozen_at
        FROM research_cohort
        WHERE cohort_id = ?
        """, (rs, row) -> new ResearchCohortSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
        rs.getTimestamp(7).toInstant(), rs.getTimestamp(8) == null ? null : rs.getTimestamp(8).toInstant()), cohortId);
  }

  public List<ResearchCohortSummary> cohorts() {
    return jdbc.query("""
        SELECT cohort_id, name, disease_scope, inclusion_criteria, exclusion_criteria, status, created_at, frozen_at
        FROM research_cohort
        ORDER BY created_at DESC
        """, (rs, row) -> new ResearchCohortSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
        rs.getTimestamp(7).toInstant(), rs.getTimestamp(8) == null ? null : rs.getTimestamp(8).toInstant()));
  }

  public ResearchVariableSummary upsertVariable(String cohortId, ResearchVariableRequest request) {
    if (exists("research_variable", "variable_id", request.variableId())) {
      jdbc.update("""
          UPDATE research_variable
          SET name = ?, definition = ?, source_table = ?, missing_policy = ?, version = ?
          WHERE variable_id = ?
          """, request.name(), request.definition(), request.sourceTable(), request.missingPolicy(), request.version(), request.variableId());
    } else {
      jdbc.update("""
          INSERT INTO research_variable(variable_id, cohort_id, name, definition, source_table, missing_policy, version)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          """, request.variableId(), cohortId, request.name(), request.definition(), request.sourceTable(), request.missingPolicy(), request.version());
    }
    return variable(request.variableId());
  }

  public ResearchVariableSummary variable(String variableId) {
    return jdbc.queryForObject("""
        SELECT variable_id, cohort_id, name, definition, source_table, missing_policy, version
        FROM research_variable
        WHERE variable_id = ?
        """, (rs, row) -> new ResearchVariableSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7)), variableId);
  }

  public List<ResearchVariableSummary> variables(String cohortId) {
    return jdbc.query("""
        SELECT variable_id, cohort_id, name, definition, source_table, missing_policy, version
        FROM research_variable
        WHERE cohort_id = ?
        ORDER BY variable_id
        """, (rs, row) -> new ResearchVariableSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7)), cohortId);
  }

  public ResearchQualityCheckSummary runQualityCheck(String cohortId) {
    int subjects = jdbc.queryForObject("SELECT COUNT(DISTINCT patient_id) FROM encounters WHERE diagnosis LIKE '%社区获得性肺炎%'", Integer.class);
    int missingLabs = jdbc.queryForObject("SELECT COUNT(*) FROM lab_result WHERE missing_status <> 'present'", Integer.class);
    int feedbacks = jdbc.queryForObject("SELECT COUNT(*) FROM medication_feedback", Integer.class);
    String status = missingLabs == 0 ? "passed" : "issues_found";
    String checkId = "QC-" + UUID.randomUUID();
    Instant now = Instant.now();
    String missingSummary = "critical_lab_missing_count=" + missingLabs;
    String issueSummary = "feedback_count=" + feedbacks + "; fixed Python analysis pending for final statistics";
    jdbc.update("""
        INSERT INTO research_dataset_quality_check(check_id, cohort_id, status, total_subjects, missing_summary, issue_summary, checked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, checkId, cohortId, status, subjects, missingSummary, issueSummary, now);
    return new ResearchQualityCheckSummary(checkId, cohortId, status, subjects, missingSummary, issueSummary, now);
  }

  public void freezeCohort(String cohortId) {
    int updated = jdbc.update("UPDATE research_cohort SET status = 'frozen', frozen_at = ? WHERE cohort_id = ? AND status <> 'frozen'",
        Instant.now(), cohortId);
    if (updated == 0) {
      throw new IllegalArgumentException("cohort not found or already frozen: " + cohortId);
    }
  }

  public ResearchReportDraftSummary createReportDraft(String cohortId) {
    var cohort = cohort(cohortId);
    if (!"frozen".equals(cohort.status())) {
      throw new IllegalArgumentException("cohort must be frozen before report draft generation");
    }
    var latestQuality = latestQualityCheck(cohortId);
    String reportId = "RPT-" + UUID.randomUUID();
    Instant now = Instant.now();
    String title = cohort.name() + " 科研报告草稿";
    String body = "# " + title + "\n\n"
        + "## 队列口径\n" + cohort.inclusionCriteria() + "\n\n"
        + "## 排除标准\n" + cohort.exclusionCriteria() + "\n\n"
        + "## 数据质量\n" + latestQuality.missingSummary() + "\n\n"
        + "## 统计说明\n固定 Python 统计代码尚待运行，本草稿不得包装成可投稿结论。";
    jdbc.update("""
        INSERT INTO research_report_draft(report_id, cohort_id, status, title, markdown_body, generated_at)
        VALUES (?, ?, 'draft', ?, ?, ?)
        """, reportId, cohortId, title, body, now);
    return new ResearchReportDraftSummary(reportId, cohortId, "draft", title, body, now, null, null);
  }

  public ResearchQualityCheckSummary latestQualityCheck(String cohortId) {
    var rows = jdbc.query("""
        SELECT check_id, cohort_id, status, total_subjects, missing_summary, issue_summary, checked_at
        FROM research_dataset_quality_check
        WHERE cohort_id = ?
        ORDER BY checked_at DESC
        LIMIT 1
        """, (rs, row) -> new ResearchQualityCheckSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getString(5), rs.getString(6), rs.getTimestamp(7).toInstant()), cohortId);
    if (rows.isEmpty()) {
      throw new IllegalArgumentException("quality check required before report draft generation");
    }
    return rows.get(0);
  }

  public List<ResearchReportDraftSummary> reportDrafts(String cohortId) {
    return jdbc.query("""
        SELECT report_id, cohort_id, status, title, markdown_body, generated_at, reviewed_at, review_note
        FROM research_report_draft
        WHERE cohort_id = ?
        ORDER BY generated_at DESC
        """, (rs, row) -> new ResearchReportDraftSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getTimestamp(6).toInstant(),
        rs.getTimestamp(7) == null ? null : rs.getTimestamp(7).toInstant(), rs.getString(8)), cohortId);
  }

  public ResearchReportDraftSummary reviewReport(String reportId, String note) {
    int updated = jdbc.update("""
        UPDATE research_report_draft
        SET status = 'reviewed', reviewed_at = ?, review_note = ?
        WHERE report_id = ?
        """, Instant.now(), note, reportId);
    if (updated == 0) {
      throw new IllegalArgumentException("report draft not found: " + reportId);
    }
    return jdbc.queryForObject("""
        SELECT report_id, cohort_id, status, title, markdown_body, generated_at, reviewed_at, review_note
        FROM research_report_draft
        WHERE report_id = ?
        """, (rs, row) -> new ResearchReportDraftSummary(
        rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getTimestamp(6).toInstant(),
        rs.getTimestamp(7).toInstant(), rs.getString(8)), reportId);
  }

  public void audit(String actor, String action, String objectId, String detail) {
    jdbc.update("INSERT INTO audit_log(audit_id, actor, action, object_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        "AUD-" + UUID.randomUUID(), actor, action, objectId, detail, Instant.now());
  }

  public boolean inboundEventExists(String sourceSystem, String sourceBatchId, String eventType) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM inbound_event
        WHERE source_system = ? AND source_batch_id = ? AND event_type = ?
        """, Integer.class, sourceSystem, sourceBatchId, eventType);
    return count != null && count > 0;
  }

  public void insertInboundEvent(String eventId, String sourceSystem, String sourceBatchId, String eventType, String status, String payloadVersion, String payloadHash, String errorMessage) {
    jdbc.update("""
        INSERT INTO inbound_event(event_id, source_system, source_batch_id, event_type, status, payload_version, payload_hash, error_message, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, eventId, sourceSystem, sourceBatchId, eventType, status, payloadVersion, payloadHash, errorMessage, Instant.now());
  }

  public void updateInboundEvent(String eventId, String status, String errorMessage) {
    jdbc.update("UPDATE inbound_event SET status = ?, error_message = ?, applied_at = ? WHERE event_id = ?",
        status, errorMessage, Instant.now(), eventId);
  }

  public void upsertPatient(String patientId, String hisPatientId, String displayName, String sex, int age) {
    if (exists("patients", "patient_id", patientId)) {
      jdbc.update("UPDATE patients SET his_patient_id = ?, display_name = ?, sex = ?, age = ? WHERE patient_id = ?",
          hisPatientId, displayName, sex, age, patientId);
    } else {
      jdbc.update("INSERT INTO patients(patient_id, his_patient_id, display_name, sex, age) VALUES (?, ?, ?, ?, ?)",
          patientId, hisPatientId, displayName, sex, age);
    }
  }

  public boolean upsertEncounterIfCurrent(String encounterId, String patientId, String department, String diagnosis, String scenario, int dataVersion) {
    Integer existingVersion = jdbc.query("SELECT data_version FROM encounters WHERE encounter_id = ?",
        rs -> rs.next() ? rs.getInt(1) : null, encounterId);
    if (existingVersion != null && existingVersion > dataVersion) {
      return false;
    }
    if (existingVersion != null && dataVersion > existingVersion) {
      expireRecommendationsForEncounter(encounterId, "source data version changed from " + existingVersion + " to " + dataVersion);
    }
    if (existingVersion != null) {
      jdbc.update("""
          UPDATE encounters
          SET patient_id = ?, department = ?, diagnosis = ?, scenario = ?, data_version = ?
          WHERE encounter_id = ?
          """, patientId, department, diagnosis, scenario, dataVersion, encounterId);
    } else {
      jdbc.update("""
          INSERT INTO encounters(encounter_id, patient_id, department, diagnosis, scenario, data_version, admitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          """, encounterId, patientId, department, diagnosis, scenario, dataVersion, Instant.now());
    }
    return true;
  }

  public void expireRecommendationsForEncounter(String encounterId, String reason) {
    jdbc.update("""
        UPDATE recommendation_snapshot
        SET status = 'expired', expired_at = ?
        WHERE encounter_id = ? AND status <> 'expired'
        """, Instant.now(), encounterId);
    audit("system", "RECOMMENDATION_EXPIRED", encounterId, reason);
  }

  public void upsertDrugCatalog(String drugCode, String name, String pharmacologyClass, String status) {
    if (exists("drug_catalog", "drug_code", drugCode)) {
      jdbc.update("UPDATE drug_catalog SET name = ?, pharmacology_class = ?, status = ? WHERE drug_code = ?",
          name, pharmacologyClass, status, drugCode);
    } else {
      jdbc.update("INSERT INTO drug_catalog(drug_code, name, pharmacology_class, status) VALUES (?, ?, ?, ?)",
          drugCode, name, pharmacologyClass, status);
    }
  }

  public void upsertMapping(String internalId, String sourceSystem, String sourceId, String objectType, int version) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM source_identifier_mapping
        WHERE internal_id = ? AND source_system = ? AND object_type = ?
        """, Integer.class, internalId, sourceSystem, objectType);
    if (count != null && count > 0) {
      jdbc.update("""
          UPDATE source_identifier_mapping
          SET source_id = ?, version = ?
          WHERE internal_id = ? AND source_system = ? AND object_type = ?
          """, sourceId, version, internalId, sourceSystem, objectType);
    } else {
      jdbc.update("""
          INSERT INTO source_identifier_mapping(internal_id, source_system, source_id, object_type, version)
          VALUES (?, ?, ?, ?, ?)
          """, internalId, sourceSystem, sourceId, objectType, version);
    }
  }

  public void upsertCursor(String sourceSystem, String streamName, String cursorValue) {
    Integer count = jdbc.queryForObject("""
        SELECT COUNT(*) FROM source_sync_cursor
        WHERE source_system = ? AND stream_name = ?
        """, Integer.class, sourceSystem, streamName);
    if (count != null && count > 0) {
      jdbc.update("UPDATE source_sync_cursor SET cursor_value = ?, updated_at = ? WHERE source_system = ? AND stream_name = ?",
          cursorValue, Instant.now(), sourceSystem, streamName);
    } else {
      jdbc.update("INSERT INTO source_sync_cursor(source_system, stream_name, cursor_value, updated_at) VALUES (?, ?, ?, ?)",
          sourceSystem, streamName, cursorValue, Instant.now());
    }
  }

  private boolean exists(String table, String idColumn, String id) {
    Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + idColumn + " = ?", Integer.class, id);
    return count != null && count > 0;
  }

  public Map<String, Object> latestPersistenceSnapshot() {
    var snapshot = new java.util.LinkedHashMap<String, Object>();
    snapshot.put("decisionCount", jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_decision", Integer.class));
    snapshot.put("draftCount", jdbc.queryForObject("SELECT COUNT(*) FROM prescription_draft", Integer.class));
    snapshot.put("auditCount", jdbc.queryForObject("SELECT COUNT(*) FROM audit_log", Integer.class));
    snapshot.put("reviewCount", jdbc.queryForObject("SELECT COUNT(*) FROM pharmacist_review_task", Integer.class));
    snapshot.put("recommendationSnapshotCount", jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_snapshot", Integer.class));
    snapshot.put("latestDrafts", jdbc.queryForList("SELECT draft_id, status, his_status, encounter_id FROM prescription_draft ORDER BY created_at DESC LIMIT 5"));
    snapshot.put("latestReviews", jdbc.queryForList("SELECT review_id, status, priority, reason FROM pharmacist_review_task ORDER BY created_at DESC LIMIT 5"));
    snapshot.put("latestCollaborations", jdbc.queryForList("SELECT task_id, status, target_department, reason FROM collaboration_task ORDER BY created_at DESC LIMIT 5"));
    snapshot.put("latestDraftWriteTasks", jdbc.queryForList("SELECT task_id, draft_id, status, attempt_count FROM prescription_draft_write_task ORDER BY updated_at DESC LIMIT 5"));
    snapshot.put("latestAudits", jdbc.queryForList("SELECT action, object_id, detail FROM audit_log ORDER BY created_at DESC LIMIT 5"));
    snapshot.put("latestInboundEvents", jdbc.queryForList("SELECT source_system, source_batch_id, event_type, status FROM inbound_event ORDER BY received_at DESC LIMIT 5"));
    snapshot.put("latestRuleExecutions", jdbc.queryForList("SELECT rule_id, result_level, blocked, encounter_id FROM rule_execution ORDER BY executed_at DESC LIMIT 5"));
    snapshot.put("timelineCount", jdbc.queryForObject("SELECT COUNT(*) FROM medication_timeline_event", Integer.class));
    snapshot.put("researchCohortCount", jdbc.queryForObject("SELECT COUNT(*) FROM research_cohort", Integer.class));
    return snapshot;
  }
}
