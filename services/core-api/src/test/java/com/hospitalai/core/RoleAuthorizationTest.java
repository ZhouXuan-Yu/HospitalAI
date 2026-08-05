package com.hospitalai.core;

import static org.hamcrest.Matchers.containsString;
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
class RoleAuthorizationTest {
  @Autowired MockMvc mvc;

  @Test
  void protectsDebugArtifactWorkerAndAdrResolutionFromDefaultDoctorRole() throws Exception {
    mvc.perform(get("/api/debug/persistence"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error", containsString("doctor")));

    mvc.perform(get("/api/research/artifacts").param("uri", "local://research/COHORT/exports/x.jsonl"))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/research/analysis-tasks/process-next"))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/adr/reviews/ADR-P003-LEV/resolve")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "decision": "confirm", "note": "doctor should not confirm ADR" }
                """))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/pharmacist/reviews/REV-NOT-EXIST/resolve")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "resolution": "doctor should not resolve pharmacist review" }
                """))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/collaboration/tasks/COL-NOT-EXIST/resolve")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                { "resolution": "doctor should not resolve collaboration task" }
                """))
        .andExpect(status().isForbidden());
  }

  @Test
  void allowsExplicitAuthorizedDevelopmentRoles() throws Exception {
    mvc.perform(get("/api/debug/persistence").header("X-HospitalAI-Role", "admin"))
        .andExpect(status().isOk());

    mvc.perform(post("/api/research/analysis-tasks/process-next").header("X-HospitalAI-Role", "worker"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").exists());
  }
}
