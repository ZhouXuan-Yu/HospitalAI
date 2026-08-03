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
        .andExpect(jsonPath("$[*].reviewId", hasItem(reviewId)));

    mvc.perform(post("/api/pharmacist/reviews/" + reviewId + "/resolve")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "resolution": "药师已复核强提醒，建议医生在 HIS 正式确认前再次核对。" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("resolved")));

    mvc.perform(post("/api/prescription-drafts/" + draftId + "/callback")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "hisStatus": "his_confirmed", "hisMessage": "HIS 已确认草稿被医生处理" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("his_confirmed")))
        .andExpect(jsonPath("$.hisStatus", is("his_confirmed")));
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
