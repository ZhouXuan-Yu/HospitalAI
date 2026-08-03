package com.hospitalai.core;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class TrackingAndResearchAssetsTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;

  @Test
  void recordsMedicationTimelineFeedbackAndDischargeOutcome() throws Exception {
    mvc.perform(post("/api/patients/P001/timeline")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "encounterId": "E001",
                  "eventType": "draft_written",
                  "drugCode": "D-CEF",
                  "drugName": "头孢曲松",
                  "sourceSystem": "HospitalAI",
                  "sourceId": "TEST-DRAFT",
                  "detail": "处方草稿写入后进入用药事件链"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.eventType", is("draft_written")));

    mvc.perform(post("/api/patients/P001/feedback")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "encounterId": "E001",
                  "drugCode": "D-CEF",
                  "effectiveness": "improved",
                  "adverseSignal": "rash_signal",
                  "reporterRole": "doctor",
                  "note": "出现皮疹信号，需药师复核后决定是否升级为 ADR。"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.adverseSignal", is("rash_signal")));

    mvc.perform(get("/api/patients/P001/timeline"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].eventType", hasItem("adverse_signal")));

    mvc.perform(post("/api/patients/P001/outcomes")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "encounterId": "E001",
                  "outcomeStatus": "improved_discharge",
                  "readmissionRisk": "medium",
                  "followupRequired": true,
                  "note": "出院后需要药学随访。"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.followupRequired", is(true)));

    mvc.perform(get("/api/patients/P001/outcomes"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].outcomeStatus", hasItem("improved_discharge")));
  }

  @Test
  void createsQualityChecksFreezesCohortAndGeneratesReviewedReportDraft() throws Exception {
    mvc.perform(post("/api/research/cohorts")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "cohortId": "COHORT-CAP-001",
                  "name": "CAP 住院患者药学队列",
                  "diseaseScope": "社区获得性肺炎",
                  "inclusionCriteria": "诊断包含社区获得性肺炎的呼吸内科住院患者",
                  "exclusionCriteria": "缺少基础就诊标识或真实身份未脱敏的数据"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("draft")));

    mvc.perform(post("/api/research/cohorts/COHORT-CAP-001/variables")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "variableId": "VAR-CAP-CRP",
                  "name": "CRP",
                  "definition": "入院后首个 C反应蛋白 检验结果",
                  "sourceTable": "lab_result",
                  "missingPolicy": "missing_not_normal",
                  "version": "2026.08"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sourceTable", is("lab_result")));

    mvc.perform(post("/api/research/cohorts/COHORT-CAP-001/quality-check"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.missingSummary", containsString("critical_lab_missing_count=")));

    mvc.perform(post("/api/research/cohorts/COHORT-CAP-001/freeze"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("frozen")));

    String reportJson = mvc.perform(post("/api/research/cohorts/COHORT-CAP-001/reports"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("draft")))
        .andExpect(jsonPath("$.markdownBody", containsString("不得包装成可投稿结论")))
        .andReturn().getResponse().getContentAsString();
    String reportId = mapper.readTree(reportJson).get("reportId").asText();

    mvc.perform(post("/api/research/reports/" + reportId + "/review")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "reviewNote": "科研负责人已审核草稿口径，仅作为数据资产演示。" }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("reviewed")));
  }
}
