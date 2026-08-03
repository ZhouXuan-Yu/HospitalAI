package com.hospitalai.core.service;

import com.hospitalai.core.model.Dto.EvidenceDocumentRequest;
import com.hospitalai.core.model.Dto.EvidenceLifecycleResponse;
import com.hospitalai.core.model.Dto.EvidenceParseRequest;
import com.hospitalai.core.repository.WorkbenchRepository;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EvidenceGovernanceService {
  private final WorkbenchRepository repo;
  private final String actor;

  public EvidenceGovernanceService(WorkbenchRepository repo, @Value("${hospitalai.dev-user}") String actor) {
    this.repo = repo;
    this.actor = actor;
  }

  @Transactional
  public EvidenceLifecycleResponse upload(EvidenceDocumentRequest request) {
    requireDocument(request);
    repo.upsertEvidenceDocument(request, "uploaded");
    repo.audit(actor, "EVIDENCE_UPLOADED", request.evidenceId(), request.title());
    return new EvidenceLifecycleResponse(request.evidenceId(), "uploaded", "EVIDENCE_UPLOADED", 0, 0);
  }

  @Transactional
  public EvidenceLifecycleResponse parse(String evidenceId, EvidenceParseRequest request) {
    String text = repo.evidenceText(evidenceId);
    String blockType = request != null && request.blockType() != null && !request.blockType().isBlank() ? request.blockType() : "paragraph";
    List<String> blocks = Arrays.stream(text.split("\\R+"))
        .map(String::trim)
        .filter(line -> !line.isBlank())
        .toList();
    if (blocks.isEmpty()) {
      throw new IllegalArgumentException("evidence text has no parsable content");
    }
    int count = repo.replaceEvidenceBlocksAndChunks(evidenceId, blockType, blocks, "review_pending");
    repo.updateEvidenceStatus(evidenceId, "review_pending");
    repo.audit(actor, "EVIDENCE_PARSED", evidenceId, "blocks=" + count + ", parser=" + (request == null ? "default" : request.parserVersion()));
    return new EvidenceLifecycleResponse(evidenceId, "review_pending", "EVIDENCE_PARSED", count, count);
  }

  @Transactional
  public EvidenceLifecycleResponse publish(String evidenceId) {
    repo.updateEvidenceStatus(evidenceId, "published");
    repo.audit(actor, "EVIDENCE_PUBLISHED", evidenceId, "published evidence and chunks");
    return new EvidenceLifecycleResponse(evidenceId, "published", "EVIDENCE_PUBLISHED", 0, 0);
  }

  @Transactional
  public EvidenceLifecycleResponse withdraw(String evidenceId) {
    repo.updateEvidenceStatus(evidenceId, "withdrawn");
    repo.audit(actor, "EVIDENCE_WITHDRAWN", evidenceId, "withdrawn evidence and chunks");
    return new EvidenceLifecycleResponse(evidenceId, "withdrawn", "EVIDENCE_WITHDRAWN", 0, 0);
  }

  private static void requireDocument(EvidenceDocumentRequest request) {
    if (request == null || blank(request.evidenceId()) || blank(request.title()) || blank(request.version())
        || blank(request.effectiveDate()) || blank(request.scope()) || blank(request.locator()) || blank(request.text())) {
      throw new IllegalArgumentException("evidenceId, title, version, effectiveDate, scope, locator and text are required");
    }
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
