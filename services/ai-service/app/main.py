from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


app = FastAPI(title="HospitalAI AI Service", version="1.0.0")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    body = await request.body()
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body.decode("utf-8", errors="replace")},
    )


class EvidenceRequest(BaseModel):
    encounterId: str
    patientId: str
    diagnosis: str
    facts: list[Any] = Field(default_factory=list)


DEMO_SNIPPETS = [
    {
        "evidenceId": "EV-CAP-001",
        "title": "CAP演示证据集：住院成人初始抗感染路径",
        "status": "demo_unpublished",
        "version": "2026.08-demo",
        "effectiveDate": "2026-08-03",
        "locator": "第2页-初始方案",
        "text": "演示证据：候选药物必须来自院内目录；无明确过敏或严重不良反应时，可比较β内酰胺类、头孢菌素类、大环内酯类和喹诺酮类方案。",
        "score": 0.92,
    },
    {
        "evidenceId": "EV-CAP-002",
        "title": "CAP演示证据集：监测要求",
        "status": "demo_unpublished",
        "version": "2026.08-demo",
        "effectiveDate": "2026-08-03",
        "locator": "第4页-监测项目",
        "text": "演示证据：推荐前需检查过敏史、当前有效用药和关键检验；关键检验缺失时不得按正常值处理。",
        "score": 0.88,
    },
]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "deterministic-demo"}


@app.post("/v1/evidence/retrieve")
def retrieve_evidence(request: EvidenceRequest) -> dict[str, Any]:
    if "社区获得性肺炎" not in request.diagnosis:
        return {
            "status": "insufficient_evidence",
            "snippets": [],
            "explanationDraft": "证据不足：当前演示证据集只覆盖呼吸内科 CAP 试点。",
        }

    keywords = {str(fact) for fact in request.facts}
    ranked = DEMO_SNIPPETS.copy()
    if "确认过敏" in keywords:
        ranked[0] = {**ranked[0], "score": 0.95}

    return {
        "status": "demo_unpublished",
        "pipeline": [
            "metadata_filter",
            "keyword_recall",
            "vector_recall_simulated",
            "rerank_deterministic",
            "explanation_draft",
        ],
        "snippets": ranked,
        "explanationDraft": "解释草稿仅基于演示证据和结构化事实，不能替代医生或药师审核。",
    }
