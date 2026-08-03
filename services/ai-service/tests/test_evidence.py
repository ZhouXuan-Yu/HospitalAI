from fastapi.testclient import TestClient

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
