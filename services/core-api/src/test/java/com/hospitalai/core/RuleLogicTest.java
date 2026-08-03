package com.hospitalai.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.hospitalai.core.model.Dto.Encounter;
import com.hospitalai.core.model.Dto.Fact;
import com.hospitalai.core.model.Dto.PatientProfile;
import com.hospitalai.core.service.RecommendationService;
import com.hospitalai.core.repository.WorkbenchRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RuleLogicTest {
  @Test
  void secondAdmissionInheritsConfirmedAllergyAsBlockingRule() {
    var service = serviceFor("E002-2", "P002", List.of(Map.of("drug_code", "D-AMOX", "drug_name", "阿莫西林克拉维酸钾", "severity", "high", "source_id", "HIS-ALG-002")), List.of(), List.of());
    var payload = service.buildWorkbench("E002-2");
    assertThat(payload.alerts()).anyMatch(alert -> alert.ruleId().equals("HR-ALG-001") && alert.blocking());
    assertThat(payload.candidates()).anyMatch(candidate -> candidate.candidateId().equals("C-AMOX") && candidate.blocked());
  }

  @Test
  void missingLabIsFlaggedAndNotTreatedAsNormal() {
    var service = serviceFor("E005", "P005", List.of(), List.of(), List.of(Map.of("name", "肌酐", "source_id", "LIS-010")));
    var payload = service.buildWorkbench("E005");
    assertThat(payload.missingInfo()).anyMatch(item -> item.contains("缺失"));
    assertThat(payload.alerts()).anyMatch(alert -> alert.ruleId().equals("HR-MISS-001"));
  }

  private RecommendationService serviceFor(String encounterId, String patientId, List<Map<String, Object>> allergies, List<Map<String, Object>> adrs, List<Map<String, Object>> missingLabs) {
    var repo = mock(WorkbenchRepository.class);
    when(repo.patientForEncounter(encounterId)).thenReturn(new PatientProfile(patientId, "合成患者", "F", 66, "HIS_SIMULATOR", "HIS-" + patientId));
    when(repo.encounter(encounterId)).thenReturn(new Encounter(encounterId, patientId, "呼吸内科", "社区获得性肺炎", 1, "test"));
    when(repo.facts(anyString(), anyString())).thenReturn(List.<Fact>of());
    when(repo.confirmedAllergies(patientId)).thenReturn(allergies);
    when(repo.severeAdrs(patientId)).thenReturn(adrs);
    when(repo.activeOrders(patientId)).thenReturn(List.of());
    when(repo.missingLabs(encounterId)).thenReturn(missingLabs);
    return new RecommendationService(repo, "http://127.0.0.1:1", "test_doctor");
  }
}
