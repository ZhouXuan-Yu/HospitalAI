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

  public void insertDecision(String decisionId, String recommendationId, String encounterId, DecisionRequest request, String actor) {
    jdbc.update("""
        INSERT INTO recommendation_decision(decision_id, recommendation_id, encounter_id, candidate_id, action, original_version, modified_regimen, reason, actor, created_at)
        VALUES (?, ?, ?, ?, ?, 'candidate.v1', ?, ?, ?, ?)
        """, decisionId, recommendationId, encounterId, request.candidateId(), request.action(), request.modifiedRegimen(), request.reason(), actor, Instant.now());
  }

  public String insertDraft(String decisionId, String encounterId) {
    var draftId = "DRAFT-" + UUID.randomUUID();
    jdbc.update("INSERT INTO prescription_draft(draft_id, decision_id, encounter_id, status, idempotency_key, created_at) VALUES (?, ?, ?, 'SIMULATED_DRAFT_WRITTEN', ?, ?)",
        draftId, decisionId, encounterId, "draft-" + decisionId, Instant.now());
    return draftId;
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
    return Map.of(
        "decisionCount", jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_decision", Integer.class),
        "draftCount", jdbc.queryForObject("SELECT COUNT(*) FROM prescription_draft", Integer.class),
        "auditCount", jdbc.queryForObject("SELECT COUNT(*) FROM audit_log", Integer.class),
        "latestDrafts", jdbc.queryForList("SELECT draft_id, status, encounter_id FROM prescription_draft ORDER BY created_at DESC LIMIT 5"),
        "latestAudits", jdbc.queryForList("SELECT action, object_id, detail FROM audit_log ORDER BY created_at DESC LIMIT 5"),
        "latestInboundEvents", jdbc.queryForList("SELECT source_system, source_batch_id, event_type, status FROM inbound_event ORDER BY received_at DESC LIMIT 5")
    );
  }
}
