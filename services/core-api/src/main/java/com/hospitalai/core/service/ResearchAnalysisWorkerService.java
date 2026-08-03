package com.hospitalai.core.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospitalai.core.model.Dto.ResearchAnalysisRunSummary;
import com.hospitalai.core.model.Dto.ResearchAnalysisTaskSummary;
import com.hospitalai.core.model.Dto.ResearchAnalysisWorkerResponse;
import com.hospitalai.core.repository.WorkbenchRepository;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResearchAnalysisWorkerService {
  private final WorkbenchRepository repository;
  private final ObjectMapper mapper;
  private final HttpClient httpClient;
  private final String aiServiceBaseUrl;

  public ResearchAnalysisWorkerService(WorkbenchRepository repository, ObjectMapper mapper, @Value("${ai.service-base-url:http://localhost:8000}") String aiServiceBaseUrl) {
    this.repository = repository;
    this.mapper = mapper;
    this.aiServiceBaseUrl = aiServiceBaseUrl.replaceAll("/+$", "");
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
  }

  public ResearchAnalysisWorkerResponse processNext() {
    ResearchAnalysisTaskSummary task = repository.claimNextResearchAnalysisTask();
    if (task == null) {
      return new ResearchAnalysisWorkerResponse("idle", null, null, "no eligible research analysis task");
    }
    try {
      Map<String, Object> snapshot = repository.researchAnalysisSnapshot(task);
      String responseBody = postStatisticsSnapshot(snapshot);
      Map<?, ?> response = mapper.readValue(responseBody, Map.class);
      if (!"completed".equals(response.get("status"))) {
        throw new IllegalStateException("AI statistics service returned non-completed status");
      }
      String resultSummaryJson = mapper.writeValueAsString(response.get("resultSummary"));
      ResearchAnalysisRunSummary run = repository.completeResearchAnalysisTask(
          task.taskId(),
          String.valueOf(response.get("inputHash")),
          String.valueOf(response.get("outputHash")),
          resultSummaryJson);
      repository.audit("research_worker", "RESEARCH_ANALYSIS_TASK_COMPLETED", task.taskId(), run.runId());
      return new ResearchAnalysisWorkerResponse("completed", repository.analysisTasks(task.cohortId(), "completed").get(0), run, "statistics completed by AI service");
    } catch (Exception ex) {
      ResearchAnalysisTaskSummary failed = repository.markResearchAnalysisTaskFailure(task.taskId(), ex.getMessage());
      repository.audit("research_worker", "RESEARCH_ANALYSIS_TASK_FAILED", task.taskId(), ex.getMessage());
      return new ResearchAnalysisWorkerResponse(failed.status(), failed, null, ex.getMessage());
    }
  }

  private String postStatisticsSnapshot(Map<String, Object> snapshot) throws IOException, InterruptedException {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(aiServiceBaseUrl + "/v1/research/statistics/run"))
        .timeout(Duration.ofSeconds(5))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(toJson(snapshot)))
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException("AI statistics service returned HTTP " + response.statusCode());
    }
    return response.body();
  }

  private String toJson(Map<String, Object> snapshot) {
    try {
      return mapper.writeValueAsString(snapshot);
    } catch (JsonProcessingException ex) {
      throw new IllegalArgumentException("failed to serialize research snapshot", ex);
    }
  }
}
