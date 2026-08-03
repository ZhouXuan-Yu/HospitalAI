package com.hospitalai.core.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitalai.core.model.Dto.SnapshotImportRequest;
import com.hospitalai.core.model.Dto.SnapshotImportResponse;
import com.hospitalai.core.repository.WorkbenchRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HisSnapshotImportService {
  private static final String EVENT_TYPE = "his.snapshot.imported";

  private final WorkbenchRepository repo;
  private final ObjectMapper mapper;
  private final String actor;

  public HisSnapshotImportService(WorkbenchRepository repo, ObjectMapper mapper, @Value("${hospitalai.dev-user}") String actor) {
    this.repo = repo;
    this.mapper = mapper;
    this.actor = actor;
  }

  @Transactional
  public SnapshotImportResponse importSnapshot(SnapshotImportRequest request) {
    requireText(request.sourceSystem(), "sourceSystem");
    requireText(request.sourceBatchId(), "sourceBatchId");
    if (request.payload() == null) {
      throw new IllegalArgumentException("payload is required");
    }

    String schemaVersion = requireText(asString(request.payload().get("schemaVersion")), "payload.schemaVersion");
    String eventId = "IN-" + UUID.randomUUID();
    String hash = payloadHash(request.payload());
    if (repo.inboundEventExists(request.sourceSystem(), request.sourceBatchId(), EVENT_TYPE)) {
      repo.audit(actor, "HIS_SNAPSHOT_IMPORT_DUPLICATE", request.sourceBatchId(), "duplicate inbound batch ignored");
      return new SnapshotImportResponse(eventId, "ignored_duplicate", schemaVersion, 0, 0, 0, 0, List.of("source batch already imported"));
    }

    repo.insertInboundEvent(eventId, request.sourceSystem(), request.sourceBatchId(), EVENT_TYPE, "received", schemaVersion, hash, null);
    try {
      int patientCount = importPatients(request.sourceSystem(), request.payload());
      var encounterResult = importEncounters(request.sourceSystem(), request.payload());
      int catalogCount = importCatalog(request.payload());
      repo.upsertCursor(request.sourceSystem(), "snapshot", request.sourceBatchId() + "@" + Instant.now());
      repo.updateInboundEvent(eventId, "applied", null);
      repo.audit(actor, "HIS_SNAPSHOT_IMPORTED", eventId, "patients=" + patientCount + ", encounters=" + encounterResult.count() + ", catalog=" + catalogCount);
      return new SnapshotImportResponse(eventId, "applied", schemaVersion, patientCount, encounterResult.count(), catalogCount, patientCount + encounterResult.mappingCount(), encounterResult.warnings());
    } catch (RuntimeException ex) {
      repo.updateInboundEvent(eventId, "failed", ex.getMessage());
      repo.audit(actor, "HIS_SNAPSHOT_IMPORT_FAILED", eventId, ex.getMessage());
      throw ex;
    }
  }

  private int importPatients(String sourceSystem, Map<String, Object> payload) {
    int count = 0;
    for (Map<String, Object> row : listOfMaps(payload.get("patients"), "patients")) {
      String internalId = requireText(asString(row.get("internalPatientId")), "patients.internalPatientId");
      String hisPatientId = requireText(asString(row.get("hisPatientId")), "patients.hisPatientId");
      repo.upsertPatient(internalId, hisPatientId, requireText(asString(row.get("displayName")), "patients.displayName"),
          requireText(asString(row.get("sex")), "patients.sex"), asInt(row.get("age"), "patients.age"));
      repo.upsertMapping(internalId, sourceSystem, hisPatientId, "PatientProfile", 1);
      count++;
    }
    return count;
  }

  private EncounterImportResult importEncounters(String sourceSystem, Map<String, Object> payload) {
    int count = 0;
    int mappings = 0;
    var warnings = new ArrayList<String>();
    for (Map<String, Object> row : listOfMaps(payload.get("encounters"), "encounters")) {
      String encounterId = requireText(asString(row.get("encounterId")), "encounters.encounterId");
      int version = asInt(row.get("dataVersion"), "encounters.dataVersion");
      boolean applied = repo.upsertEncounterIfCurrent(encounterId,
          requireText(asString(row.get("patientId")), "encounters.patientId"),
          requireText(asString(row.get("department")), "encounters.department"),
          requireText(asString(row.get("diagnosis")), "encounters.diagnosis"),
          requireText(asString(row.get("scenario")), "encounters.scenario"),
          version);
      if (applied) {
        repo.upsertMapping(encounterId, sourceSystem, encounterId, "Encounter", version);
        count++;
        mappings++;
      } else {
        warnings.add("ignored old version update for encounter " + encounterId);
      }
    }
    return new EncounterImportResult(count, mappings, warnings);
  }

  private int importCatalog(Map<String, Object> payload) {
    int count = 0;
    for (Map<String, Object> row : listOfMaps(payload.get("drugCatalog"), "drugCatalog")) {
      repo.upsertDrugCatalog(requireText(asString(row.get("drugCode")), "drugCatalog.drugCode"),
          requireText(asString(row.get("name")), "drugCatalog.name"),
          requireText(asString(row.get("class")), "drugCatalog.class"),
          requireText(asString(row.get("status")), "drugCatalog.status"));
      count++;
    }
    return count;
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> listOfMaps(Object value, String field) {
    if (value == null) {
      return List.of();
    }
    if (!(value instanceof List<?> list)) {
      throw new IllegalArgumentException(field + " must be an array");
    }
    for (Object item : list) {
      if (!(item instanceof Map<?, ?>)) {
        throw new IllegalArgumentException(field + " must contain objects");
      }
    }
    return (List<Map<String, Object>>) value;
  }

  private static String requireText(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(field + " is required");
    }
    return value;
  }

  private static String asString(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  private static int asInt(Object value, String field) {
    if (value instanceof Number number) {
      return number.intValue();
    }
    try {
      return Integer.parseInt(requireText(asString(value), field));
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException(field + " must be an integer");
    }
  }

  private String payloadHash(Map<String, Object> payload) {
    try {
      byte[] json = mapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8);
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json));
    } catch (JsonProcessingException ex) {
      throw new IllegalArgumentException("payload cannot be serialized");
    } catch (Exception ex) {
      throw new IllegalStateException("cannot hash payload", ex);
    }
  }

  private record EncounterImportResult(int count, int mappingCount, List<String> warnings) {}
}
