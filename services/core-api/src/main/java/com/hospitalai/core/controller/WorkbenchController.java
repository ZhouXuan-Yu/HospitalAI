package com.hospitalai.core.controller;

import com.hospitalai.core.model.Dto.DecisionRequest;
import com.hospitalai.core.model.Dto.DecisionResponse;
import com.hospitalai.core.model.Dto.WorkbenchPayload;
import com.hospitalai.core.repository.WorkbenchRepository;
import com.hospitalai.core.service.RecommendationService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class WorkbenchController {
  private final RecommendationService service;
  private final WorkbenchRepository repository;

  public WorkbenchController(RecommendationService service, WorkbenchRepository repository) {
    this.service = service;
    this.repository = repository;
  }

  @GetMapping("/workbench/{encounterId}")
  public WorkbenchPayload workbench(@PathVariable String encounterId) {
    return service.buildWorkbench(encounterId);
  }

  @PostMapping("/recommendations/{recommendationId}/decision")
  public DecisionResponse decide(@PathVariable String recommendationId, @RequestBody DecisionRequest request) {
    return service.decide(recommendationId, request);
  }

  @GetMapping("/debug/persistence")
  public Map<String, Object> persistence() {
    return repository.latestPersistenceSnapshot();
  }
}
