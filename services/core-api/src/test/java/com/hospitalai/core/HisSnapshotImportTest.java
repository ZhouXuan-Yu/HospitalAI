package com.hospitalai.core;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2-demo")
class HisSnapshotImportTest {
  @Autowired MockMvc mvc;

  @Test
  void importsSnapshotThroughInboundEventAndExposesWorklist() throws Exception {
    String body = """
        {
          "sourceSystem": "HIS_IMPORT_TEST",
          "sourceBatchId": "batch-900",
          "payload": {
            "schemaVersion": "his.snapshot.v1",
            "dataClassification": "deidentified_hospital_export",
            "patients": [
              { "hisPatientId": "HIS-P900", "internalPatientId": "P900", "displayName": "导入患者900", "sex": "F", "age": 61 }
            ],
            "encounters": [
              { "encounterId": "E900", "patientId": "P900", "department": "呼吸内科", "diagnosis": "社区获得性肺炎", "scenario": "imported_real_chain", "dataVersion": 1 }
            ],
            "drugCatalog": [
              { "drugCode": "D-TEST", "name": "导入测试药品", "class": "测试分类", "status": "active" }
            ]
          }
        }
        """;

    mvc.perform(post("/api/integration/his/snapshots/import")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("applied")))
        .andExpect(jsonPath("$.patientsUpserted", is(1)))
        .andExpect(jsonPath("$.encountersUpserted", is(1)))
        .andExpect(jsonPath("$.catalogItemsUpserted", is(1)));

    mvc.perform(get("/api/worklist"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].encounterId", hasItem("E900")))
        .andExpect(jsonPath("$[*].sourcePatientId", hasItem("HIS-P900")));

    mvc.perform(get("/api/debug/persistence"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestInboundEvents[0].status", is("applied")));
  }

  @Test
  void ignoresDuplicateBatchAndRejectsOldEncounterVersion() throws Exception {
    String newer = """
        {
          "sourceSystem": "HIS_IMPORT_TEST",
          "sourceBatchId": "batch-version-new",
          "payload": {
            "schemaVersion": "his.snapshot.v1",
            "patients": [
              { "hisPatientId": "HIS-P901", "internalPatientId": "P901", "displayName": "导入患者901", "sex": "M", "age": 70 }
            ],
            "encounters": [
              { "encounterId": "E901", "patientId": "P901", "department": "呼吸内科", "diagnosis": "社区获得性肺炎", "scenario": "new_version", "dataVersion": 5 }
            ],
            "drugCatalog": []
          }
        }
        """;
    String older = newer
        .replace("batch-version-new", "batch-version-old")
        .replace("\"scenario\": \"new_version\", \"dataVersion\": 5", "\"scenario\": \"old_version\", \"dataVersion\": 2");

    mvc.perform(post("/api/integration/his/snapshots/import").contentType(MediaType.APPLICATION_JSON).content(newer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("applied")));
    mvc.perform(post("/api/integration/his/snapshots/import").contentType(MediaType.APPLICATION_JSON).content(newer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("ignored_duplicate")));
    mvc.perform(post("/api/integration/his/snapshots/import").contentType(MediaType.APPLICATION_JSON).content(older))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.warnings[0]", is("ignored old version update for encounter E901")));

    mvc.perform(get("/api/workbench/E901"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.encounter.dataVersion", is(5)))
        .andExpect(jsonPath("$.encounter.scenario", not("old_version")));
  }

  @Test
  void rejectsSnapshotWithoutSchemaVersion() throws Exception {
    String body = """
        {
          "sourceSystem": "HIS_IMPORT_TEST",
          "sourceBatchId": "batch-invalid",
          "payload": {
            "patients": [],
            "encounters": [],
            "drugCatalog": []
          }
        }
        """;

    mvc.perform(post("/api/integration/his/snapshots/import")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error", is("payload.schemaVersion is required")));
  }
}
