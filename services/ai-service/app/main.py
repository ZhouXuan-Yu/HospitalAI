from __future__ import annotations

import os
import hashlib
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


class ResearchStatisticSnapshot(BaseModel):
    cohortId: str
    scriptVersion: str = "fixed-cap-statistics.v1"
    totalSubjects: int
    variables: list[str] = Field(default_factory=list)
    feedbackRecords: int = 0
    dischargeOutcomes: int = 0
    missingSummary: str = ""


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
    mode = "deepseek-enabled" if deepseek_enabled() else "deterministic-demo"
    return {"status": "ok", "mode": mode}


@app.post("/v1/evidence/retrieve")
def retrieve_evidence(request: EvidenceRequest) -> dict[str, Any]:
    if "社区获得性肺炎" not in request.diagnosis:
        return {
            "status": "insufficient_evidence",
            "snippets": [],
            "pipeline": ["diagnosis_scope_check", "insufficient_evidence"],
            "explanationDraft": "证据不足：当前演示证据集只覆盖呼吸内科 CAP 试点。",
            "traceSummary": {
                "keyInputs": [request.diagnosis],
                "logic": "先判断诊断是否在已配置证据范围内；未覆盖病种不生成医学理由。",
                "output": "证据不足，返回空证据列表。",
                "model": "deterministic-guardrail",
            },
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
            "deepseek_explanation" if deepseek_enabled() else "explanation_draft",
        ],
        "snippets": ranked,
        "explanationDraft": build_explanation_draft(request, ranked),
        "traceSummary": {
            "keyInputs": [request.diagnosis, f"事实 {len(request.facts)} 条", f"证据 {len(ranked)} 条"],
            "logic": "按病种过滤证据，召回并排序可定位片段；DeepSeek 仅生成简要溯源说明，不生成处方决定。",
            "output": "返回候选证据片段和可折叠解释草稿。",
            "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat") if deepseek_enabled() else "deterministic-demo",
        },
    }


@app.post("/v1/research/statistics/run")
def run_research_statistics(snapshot: ResearchStatisticSnapshot) -> dict[str, Any]:
    payload = snapshot.model_dump(mode="json")
    input_hash = stable_hash(payload)
    result_summary = {
        "subjects": snapshot.totalSubjects,
        "variableCount": len(snapshot.variables),
        "feedbackRecords": snapshot.feedbackRecords,
        "dischargeOutcomes": snapshot.dischargeOutcomes,
        "missingSummary": snapshot.missingSummary,
        "limitations": ["descriptive_statistics_only", "not_publication_ready_without_human_review"],
    }
    return {
        "status": "completed",
        "scriptVersion": snapshot.scriptVersion,
        "inputHash": input_hash,
        "outputHash": stable_hash(result_summary),
        "resultSummary": result_summary,
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
            "deepseek_explanation" if deepseek_enabled() else "explanation_draft",
        ],
        "snippets": snippets,
        "explanationDraft": build_explanation_draft(request, snippets),
        "traceSummary": {
            "keyInputs": [request.diagnosis, f"事实 {len(request.facts)} 条", f"已发布证据 {len(snippets)} 条"],
            "logic": "从 Core API 取已发布证据切片并重排；DeepSeek 只压缩说明来源链路。",
            "output": "返回已发布证据片段和简要解释草稿。",
            "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat") if deepseek_enabled() else "deterministic-demo",
        },
    }


def deepseek_enabled() -> bool:
    return bool(os.getenv("DEEPSEEK_API_KEY", "").strip())


def build_explanation_draft(request: EvidenceRequest, snippets: list[dict[str, Any]]) -> str:
    fallback = "解释草稿仅基于受控证据和结构化事实，不能替代医生或药师审核。"
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        return fallback
    base_url = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com").rstrip("/")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    evidence_titles = [str(item.get("title", "")) for item in snippets[:3]]
    fact_labels = [str(item) for item in request.facts[:8]]
    prompt = (
        "你是医院处方辅助决策系统的解释模块。请用中文输出不超过90字的溯源说明，"
        "只说明结果来自哪些关键输入、规则和证据，不给出新的药品、剂量或疗程建议。"
        f"\n诊断：{request.diagnosis}"
        f"\n患者事实：{'；'.join(fact_labels) or '无'}"
        f"\n证据标题：{'；'.join(evidence_titles) or '无'}"
    )
    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "只生成简洁溯源说明，禁止新增处方、剂量或诊断结论。"},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 160,
            },
            timeout=6.0,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()
        return content[:240] if content else fallback
    except Exception as exc:
        return f"{fallback} DeepSeek 解释降级：{exc}"


def stable_hash(value: Any) -> str:
    import json

    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
