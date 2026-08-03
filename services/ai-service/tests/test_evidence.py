from fastapi.testclient import TestClient
import httpx

from app.main import app


client = TestClient(app)


def test_retrieves_demo_cap_evidence():
    response = client.post(
        "/v1/evidence/retrieve",
        json={
            "encounterId": "E001",
            "patientId": "P001",
            "diagnosis": "社区获得性肺炎",
            "facts": ["诊断", "C反应蛋白"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "demo_unpublished"
    assert len(body["snippets"]) == 2
    assert body["snippets"][0]["locator"]


def test_returns_insufficient_evidence_for_out_of_scope_diagnosis():
    response = client.post(
        "/v1/evidence/retrieve",
        json={
            "encounterId": "E999",
            "patientId": "P999",
            "diagnosis": "非试点病种",
            "facts": [],
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "insufficient_evidence"
    assert response.json()["snippets"] == []


def test_retrieves_published_core_evidence(monkeypatch):
    monkeypatch.setenv("CORE_API_BASE_URL", "http://core-api.test")

    def fake_get(url, params, timeout):
      assert url == "http://core-api.test/api/evidence/chunks"
      assert params["query"] == "社区获得性肺炎"
      return httpx.Response(
          200,
          request=httpx.Request("GET", url),
          json=[
              {
                  "chunkId": "CHK-1",
                  "evidenceId": "EV-CAP-PUB-001",
                  "title": "院内已发布 CAP 用药路径",
                  "status": "published",
                  "version": "2026.08-hospital",
                  "effectiveDate": "2026-08-03",
                  "locator": "第1页",
                  "chunkText": "已发布证据切片",
                  "keywords": "CAP",
              }
          ],
      )

    monkeypatch.setattr(httpx, "get", fake_get)
    response = client.post(
        "/v1/evidence/retrieve",
        json={
            "encounterId": "E001",
            "patientId": "P001",
            "diagnosis": "社区获得性肺炎",
            "facts": ["诊断"],
        },
    )
    body = response.json()
    assert body["status"] == "published_core_evidence"
    assert body["snippets"][0]["status"] == "published"


def test_core_evidence_failure_is_explicit_degradation(monkeypatch):
    monkeypatch.setenv("CORE_API_BASE_URL", "http://core-api.test")

    def fake_get(url, params, timeout):
      raise httpx.ConnectError("offline")

    monkeypatch.setattr(httpx, "get", fake_get)
    response = client.post(
        "/v1/evidence/retrieve",
        json={
            "encounterId": "E001",
            "patientId": "P001",
            "diagnosis": "社区获得性肺炎",
            "facts": [],
        },
    )
    body = response.json()
    assert body["status"] == "core_evidence_degraded"
    assert body["snippets"] == []


def test_research_statistics_are_deterministic_and_hashed():
    payload = {
        "cohortId": "COHORT-CAP-001",
        "scriptVersion": "fixed-cap-statistics.v1",
        "totalSubjects": 5,
        "variables": ["CRP", "过敏史"],
        "feedbackRecords": 2,
        "dischargeOutcomes": 1,
        "missingSummary": "critical_lab_missing_count=1",
    }
    first = client.post("/v1/research/statistics/run", json=payload)
    second = client.post("/v1/research/statistics/run", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "completed"
    assert first.json()["scriptVersion"] == "fixed-cap-statistics.v1"
    assert first.json()["inputHash"] == second.json()["inputHash"]
    assert first.json()["outputHash"] == second.json()["outputHash"]
    assert first.json()["resultSummary"]["limitations"] == [
        "descriptive_statistics_only",
        "not_publication_ready_without_human_review",
    ]
