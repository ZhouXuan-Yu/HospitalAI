package com.hospitalai.core;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
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
class DoseAndEvidenceGovernanceApiTest {
  @Autowired MockMvc mvc;

  @Test
  void calculatesDoseOnlyFromPublishedRules() throws Exception {
    mvc.perform(post("/api/dose/calculate")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "drugCode": "D-CEF",
                  "indication": "社区获得性肺炎",
                  "patientGroup": "adult",
                  "renalFunctionMissing": false
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("calculated_from_published_rule")))
        .andExpect(jsonPath("$.ruleVersion", is("2026.08")))
        .andExpect(jsonPath("$.evidenceId", is("EV-CAP-PUB-001")))
        .andExpect(jsonPath("$.regimenText", notNullValue()));

    mvc.perform(post("/api/dose/calculate")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "drugCode": "D-VAN",
                  "indication": "社区获得性肺炎",
                  "patientGroup": "adult",
                  "renalFunctionMissing": false
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("rule_not_found")));
  }

  @Test
  void returnsOnlyPublishedEvidenceChunksForFormalRetrieval() throws Exception {
    mvc.perform(get("/api/evidence/chunks").param("query", "CAP"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].evidenceId", hasItem("EV-CAP-PUB-001")))
        .andExpect(jsonPath("$[*].evidenceId", not(hasItem("EV-CAP-001"))))
        .andExpect(jsonPath("$[*].status", everyItem(is("published"))));
  }

  @Test
  void supportsRuleDraftReviewPublishAndWithdrawLifecycle() throws Exception {
    mvc.perform(post("/api/rules")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "ruleId": "HR-TEST-001",
                  "version": "2026.09",
                  "name": "测试规则",
                  "severity": "info",
                  "basis": "测试依据，不进入正式医疗结论。",
                  "deterministicHandler": "testHandler"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("draft")));

    mvc.perform(post("/api/rules/HR-TEST-001/versions/2026.09/submit-review"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("review_pending")));
    mvc.perform(post("/api/rules/HR-TEST-001/versions/2026.09/publish"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("published")));
    mvc.perform(post("/api/rules/HR-TEST-001/versions/2026.09/withdraw"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("withdrawn")));

    mvc.perform(get("/api/debug/persistence"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestAudits[*].action", hasItem("RULE_WITHDRAWN")));
  }
}
