package com.hospitalai.core;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2-demo")
class RuleGovernanceApiTest {
  @Autowired MockMvc mvc;

  @Test
  void listsPublishedRulesAndRecordsExecutions() throws Exception {
    mvc.perform(get("/api/rules"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rules[*].ruleId", hasItem("HR-ALG-001")))
        .andExpect(jsonPath("$.cases[*].inputRef", hasItem("E002-2")));

    mvc.perform(get("/api/workbench/E002-2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.alerts[0].ruleId", is("HR-ALG-001")))
        .andExpect(jsonPath("$.alerts[0].status", is("published-demo")));

    mvc.perform(get("/api/debug/persistence").header("X-HospitalAI-Role", "admin"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latestRuleExecutions[*].rule_id", hasItem("HR-ALG-001")));
  }
}
