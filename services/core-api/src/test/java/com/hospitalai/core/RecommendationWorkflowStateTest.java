package com.hospitalai.core;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class RecommendationWorkflowStateTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;

  @Test
  void strongAlertDecisionCreatesPharmacistReviewAndHisCallbackUpdatesDraft() throws Exception {
    mvc.perform(get("/api/workbench/E004"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.alerts[*].ruleId", hasItem("HR-XDEPT-001")));

    String decision = mvc.perform(post("/api/recommendations/REC-E004-v5/decision")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "action": "adopt",
                  "candidateId": "C-CEF-AZI",
                  "reason": "测试强提醒复核闭环",
                  "riskHandling": { "acknowledged": true }
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blocked", is(false)))
        .andExpect(jsonPath("$.recommendationStatus", is("pharmacist_review_pending")))
        .andExpect(jsonPath("$.draftStatus", is("draft_written")))
        .andExpect(jsonPath("$.pharmacistReviewId", not("")))
        .andReturn().getResponse().getContentAsString();

    JsonNode node = mapper.readTree(decision);
    String reviewId = node.get("pharmacistReviewId").asText();
    String draftId = node.get("prescriptionDraftId").asText();

    mvc.perform(get("/api/pharmacist/reviews").param("status", "pending"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].reviewId", hasItem(reviewId)))
        .andExpect(jsonPath("$[*].patientName", hasItem("合成患者D")))
        .andExpect(jsonPath("$[*].department", hasItem("呼吸内科")))
        .andExpect(jsonPath("$[*].diagnosis", hasItem("社区获得性肺炎")));

    mvc.perform(post("/api/pharmacist/reviews/" + reviewId + "/resolve")
            .header("X-HospitalAI-Role", "pharmacist")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "resolution": "药师已复核强提醒，建议医生在 HIS 正式确认前再次核对。" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("resolved")));

    String collaboration = mvc.perform(get("/api/collaboration/tasks").param("status", "pending"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].targetDepartment", hasItem("心内科")))
        .andReturn().getResponse().getContentAsString();
    String taskId = mapper.readTree(collaboration).get(0).get("taskId").asText();

    mvc.perform(post("/api/collaboration/tasks/" + taskId + "/resolve")
            .header("X-HospitalAI-Role", "pharmacist")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "resolution": "心内科已确认当前有效用药，建议正式开方前调整或停用重复风险药品。" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("resolved")));

    String writeTasks = mvc.perform(get("/api/prescription-draft-write-tasks").param("status", "pending"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].draftId", hasItem(draftId)))
        .andReturn().getResponse().getContentAsString();
    String writeTaskId = mapper.readTree(writeTasks).get(0).get("taskId").asText();

    mvc.perform(post("/api/prescription-draft-write-tasks/" + writeTaskId + "/mark-failed")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "errorMessage": "HIS adapter timeout" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("retry_or_dead_letter_recorded")));

    mvc.perform(post("/api/prescription-drafts/" + draftId + "/callback")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "hisStatus": "his_confirmed", "hisMessage": "HIS 已确认草稿被医生处理" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("his_confirmed")))
        .andExpect(jsonPath("$.hisStatus", is("his_confirmed")));

    mvc.perform(get("/api/prescription-draft-write-tasks"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].status", hasItem("written")));
  }

  @Test
  void repeatedDecisionUsesSameDraftIdempotencyKey() throws Exception {
    String first = mvc.perform(post("/api/recommendations/REC-E001-v3/decision")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "action": "adopt",
                  "candidateId": "C-CEF-AZI",
                  "reason": "第一次提交",
                  "riskHandling": { "acknowledged": true }
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.draftStatus", is("draft_written")))
        .andReturn().getResponse().getContentAsString();
    String second = mvc.perform(post("/api/recommendations/REC-E001-v3/decision")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "action": "adopt",
                  "candidateId": "C-CEF-AZI",
                  "reason": "重复提交",
                  "riskHandling": { "acknowledged": true }
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.draftStatus", is("draft_written")))
        .andReturn().getResponse().getContentAsString();

    String firstDraft = mapper.readTree(first).get("prescriptionDraftId").asText();
    String secondDraft = mapper.readTree(second).get("prescriptionDraftId").asText();
    org.assertj.core.api.Assertions.assertThat(secondDraft).isEqualTo(firstDraft);
  }

  @Test
  void newerImportedEncounterVersionExpiresExistingRecommendation() throws Exception {
    mvc.perform(get("/api/workbench/E001"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recommendationId", is("REC-E001-v3")));

    mvc.perform(post("/api/integration/his/snapshots/import")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "sourceSystem": "HIS_IMPORT_TEST",
                  "sourceBatchId": "batch-e001-v9",
                  "payload": {
                    "schemaVersion": "his.snapshot.v1",
                    "patients": [
                      { "hisPatientId": "HIS-P001", "internalPatientId": "P001", "displayName": "合成患者A", "sex": "F", "age": 66 }
                    ],
                    "encounters": [
                      { "encounterId": "E001", "patientId": "P001", "department": "呼吸内科", "diagnosis": "社区获得性肺炎", "scenario": "updated_version", "dataVersion": 9 }
                    ],
                    "drugCatalog": []
                  }
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("applied")));

    mvc.perform(get("/api/recommendations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].recommendationId", hasItem("REC-E001-v3")))
        .andExpect(jsonPath("$[*].status", hasItem("expired")));
  }

  @Test
  void hardBlockDoesNotCreateDraftOrReview() throws Exception {
    mvc.perform(post("/api/recommendations/REC-E002-2-v4/decision")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "action": "adopt",
                  "candidateId": "C-AMOX",
                  "reason": "测试硬阻断",
                  "riskHandling": { "acknowledged": true }
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.blocked", is(true)))
        .andExpect(jsonPath("$.draftStatus", is("blocked_by_hard_rule")))
        .andExpect(jsonPath("$.recommendationStatus", is("blocked")));
  }
}
