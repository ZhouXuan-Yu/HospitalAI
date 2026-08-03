package com.hospitalai.core;

import static org.hamcrest.Matchers.hasItem;
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
}
