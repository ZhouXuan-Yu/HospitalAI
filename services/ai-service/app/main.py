from __future__ import annotations

import os
from typing import Any

import httpx
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

    core_result = retrieve_core_published_chunks(request)
    if core_result:
        return core_result

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


def retrieve_core_published_chunks(request: EvidenceRequest) -> dict[str, Any] | None:
    base_url = os.getenv("CORE_API_BASE_URL", "").rstrip("/")
    if not base_url:
        return None
    try:
        response = httpx.get(
            f"{base_url}/api/evidence/chunks",
            params={"query": request.diagnosis},
            timeout=2.0,
        )
        response.raise_for_status()
        chunks = response.json()
    except Exception as exc:
        return {
            "status": "core_evidence_degraded",
            "pipeline": ["metadata_filter", "core_api_published_chunk_retrieval", "fallback_required"],
            "snippets": [],
            "explanationDraft": f"Core API 证据检索不可用，禁止补写理由：{exc}",
        }
    if not chunks:
        return {
            "status": "insufficient_evidence",
            "pipeline": ["metadata_filter", "core_api_published_chunk_retrieval"],
            "snippets": [],
            "explanationDraft": "证据不足：Core API 未返回已发布证据切片。",
        }
    snippets = [
        {
            "evidenceId": item["evidenceId"],
            "title": item["title"],
            "status": item["status"],
            "version": item["version"],
            "effectiveDate": item.get("effectiveDate", ""),
            "locator": item["locator"],
            "text": item["chunkText"],
            "score": round(0.9 - index * 0.03, 2),
        }
        for index, item in enumerate(chunks[:3])
    ]
    return {
        "status": "published_core_evidence",
        "pipeline": [
            "metadata_filter",
            "core_api_published_chunk_retrieval",
            "rerank_deterministic",
            "explanation_draft",
        ],
        "snippets": snippets,
        "explanationDraft": "解释草稿仅基于 Core API 已发布证据切片和结构化事实，不能替代医生或药师审核。",
    }
