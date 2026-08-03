package com.hospitalai.core.controller;

import com.hospitalai.core.model.Dto.DecisionRequest;
import com.hospitalai.core.model.Dto.DecisionResponse;
import com.hospitalai.core.model.Dto.SnapshotImportRequest;
import com.hospitalai.core.model.Dto.SnapshotImportResponse;
import com.hospitalai.core.model.Dto.WorkbenchPayload;
import com.hospitalai.core.model.Dto.WorklistItem;
import com.hospitalai.core.repository.WorkbenchRepository;
import com.hospitalai.core.service.HisSnapshotImportService;
import com.hospitalai.core.service.RecommendationService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class WorkbenchController {
  private final RecommendationService service;
  private final WorkbenchRepository repository;
  private final HisSnapshotImportService importService;

  public WorkbenchController(RecommendationService service, WorkbenchRepository repository, HisSnapshotImportService importService) {
    this.service = service;
    this.repository = repository;
    this.importService = importService;
  }

  @GetMapping("/worklist")
  public List<WorklistItem> worklist() {
    return repository.worklist();
  }

  @GetMapping("/workbench/{encounterId}")
  public WorkbenchPayload workbench(@PathVariable String encounterId) {
    return service.buildWorkbench(encounterId);
  }

  @PostMapping("/recommendations/{recommendationId}/decision")
  public DecisionResponse decide(@PathVariable String recommendationId, @RequestBody DecisionRequest request) {
    return service.decide(recommendationId, request);
  }

  @PostMapping("/integration/his/snapshots/import")
  public SnapshotImportResponse importSnapshot(@RequestBody SnapshotImportRequest request) {
    return importService.importSnapshot(request);
  }

  @GetMapping("/debug/persistence")
  public Map<String, Object> persistence() {
    return repository.latestPersistenceSnapshot();
  }
}
