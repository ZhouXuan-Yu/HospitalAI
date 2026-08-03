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
  void uploadsParsesPublishesAndWithdrawsEvidenceDocument() throws Exception {
    mvc.perform(post("/api/evidence/documents")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "evidenceId": "EV-UP-001",
                  "title": "上传证据测试",
                  "version": "2026.09",
                  "effectiveDate": "2026-09-01",
                  "scope": "呼吸内科/社区获得性肺炎",
                  "locator": "上传文件第1页",
                  "text": "第一段：发布后可检索 CAP 测试证据。\\n第二段：撤回后不得参与正式检索。"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("uploaded")));

    mvc.perform(post("/api/evidence/documents/EV-UP-001/parse")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "parserVersion": "deterministic-paragraph-v1", "blockType": "paragraph" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("review_pending")))
        .andExpect(jsonPath("$.blockCount", is(2)))
        .andExpect(jsonPath("$.chunkCount", is(2)));

    mvc.perform(post("/api/evidence/documents/EV-UP-001/publish"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("published")));

    mvc.perform(get("/api/evidence/chunks").param("query", "上传证据测试"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].evidenceId", hasItem("EV-UP-001")));

    mvc.perform(post("/api/evidence/documents/EV-UP-001/withdraw"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("withdrawn")));

    mvc.perform(get("/api/evidence/chunks").param("query", "上传证据测试"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].evidenceId", not(hasItem("EV-UP-001"))));
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

    mvc.perform(get("/api/debug/persistence").header("X-HospitalAI-Role", "admin"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestAudits[*].action", hasItem("RULE_WITHDRAWN")));
  }
}
