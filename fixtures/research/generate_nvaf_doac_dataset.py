"""Generate a deterministic synthetic dataset for frontend workflow validation only."""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path


SEED = 20260810
COUNT = 2000
OUTPUTS = [
    Path(__file__).with_name("nvaf-doac-comparative.synthetic.v1.json"),
    Path(__file__).parents[2] / "apps" / "web" / "public" / "research" / "nvaf-doac-comparative.synthetic.v1.json",
]


def event(rng: random.Random, probability: float) -> bool:
    return rng.random() < probability


def make_record(index: int, rng: random.Random) -> dict[str, object]:
    regimen = "阿哌沙班" if index % 2 == 0 else "利伐沙班"
    age = rng.randint(65, 92) if index < 1960 else rng.randint(55, 64)
    egfr = None if index % 97 == 0 else round(rng.uniform(28, 104), 1)
    followup = rng.randint(7, 720) if index % 113 == 0 else rng.randint(90, 720)
    bleeding_probability = 0.048 if regimen == "阿哌沙班" else 0.068
    stroke_probability = 0.038 if regimen == "阿哌沙班" else 0.044
    major_bleeding = event(rng, bleeding_probability)
    ischemic_stroke = event(rng, stroke_probability)
    admitted = date(2022, 1, 1) + timedelta(days=rng.randint(0, 730))
    return {
        "recordId": f"RS-{index + 1:05d}",
        "patientId": f"SYN-RS-{index + 1:05d}",
        "encounterId": f"SYN-EN-{index + 1:05d}",
        "age": age,
        "sex": "F" if event(rng, 0.48) else "M",
        "diagnosis": "非瓣膜性心房颤动",
        "admittedAt": admitted.isoformat(),
        "regimen": regimen,
        "treatmentResponse": "stable" if not ischemic_stroke else "worsened",
        "adverseEvent": major_bleeding,
        "followupComplete": index % 89 != 0,
        "sourceVersion": "synthetic-nvaf-doac:v1",
        "followupDays": followup,
        "ischemicStroke": ischemic_stroke,
        "majorBleeding": major_bleeding,
        "death": event(rng, 0.035),
        "readmission": event(rng, 0.16),
        "switchOrStop": event(rng, 0.11),
        "egfr": egfr,
        "hypertension": event(rng, 0.72),
        "diabetes": event(rng, 0.31),
        "priorStroke": event(rng, 0.19),
        "priorBleeding": event(rng, 0.08),
        "heartFailure": event(rng, 0.24),
        "antiplateletUse": event(rng, 0.14),
    }


def variable(code: str, name: str, role: str, value_type: str, missing: str) -> dict[str, str]:
    return {"code": code, "name": name, "role": role, "type": value_type, "sourcePath": f"ResearchSubjectRecord.{code}", "missingRule": missing}


def main() -> None:
    rng = random.Random(SEED)
    records = [make_record(index, rng) for index in range(COUNT)]
    payload = {
        "schemaVersion": "hospitalai.research-dataset.v1",
        "metadata": {
            "scenarioId": "SYN-NVAF-DOAC-2000",
            "name": "老年房颤 DOAC 比较研究合成数据",
            "version": "1.0.0",
            "generatedAt": "2026-08-10T10:00:00Z",
            "source": "HospitalAI deterministic fixture generator",
            "synthetic": True,
            "disclaimer": "全部记录均为合成模拟数据，仅用于前端流程与接口验证，不构成医学证据或科研结论。",
        },
        "research": {
            "project": {
                "projectId": "PROJECT-NVAF-DOAC-2026-01",
                "title": "老年非瓣膜性房颤患者阿哌沙班与利伐沙班有效性及安全性比较",
                "owner": "药学部科研项目组",
                "protocolVersion": "PROTOCOL-NVAF-DOAC-v1.0",
                "templateCode": "NVAF-DOAC-COMPARATIVE-v1",
                "dataSource": "合成 JSON 导入（未来映射 HIS/EMR/LIS）",
                "researchQuestion": "在 65 岁及以上非瓣膜性房颤患者中，阿哌沙班与利伐沙班的血栓栓塞结局和大出血风险是否存在差异？",
                "design": "新使用者、回顾性队列研究；倾向评分稳定化 IPTW；时间结局采用 Kaplan-Meier 与 Cox 回归。",
                "inclusionCriteria": ["年龄 >= 65 岁", "非瓣膜性房颤", "阿哌沙班或利伐沙班新使用者", "随访 >= 30 天"],
                "exclusionCriteria": ["瓣膜性房颤或机械瓣膜", "索引日前抗凝药洗脱期不足", "关键暴露字段缺失", "随访不足 30 天"],
                "observationWindow": "索引日期起至结局、换药/停药、死亡或 720 天",
                "ethicsStatus": "演示项目；使用合成数据，无真实受试者。真实研究上线前必须完成伦理审批或豁免。",
            },
            "historicalRecords": records,
            "variables": [
                variable("regimen", "索引抗凝方案", "exposure", "string", "缺失则排除"),
                variable("ischemicStroke", "缺血性卒中或系统性栓塞", "outcome", "boolean", "按结局定义核验"),
                variable("majorBleeding", "大出血", "outcome", "boolean", "按 ISTH 口径核验"),
                variable("followupDays", "随访天数", "outcome", "number", "不足 30 天排除"),
                variable("age", "年龄", "confounder", "number", "缺失阻断"),
                variable("sex", "性别", "confounder", "string", "未知单列"),
                variable("egfr", "估算肾小球滤过率", "confounder", "number", "报告缺失并做敏感性分析"),
                variable("hypertension", "高血压", "confounder", "boolean", "未记录视为缺失"),
                variable("diabetes", "糖尿病", "confounder", "boolean", "未记录视为缺失"),
                variable("priorStroke", "既往卒中", "confounder", "boolean", "跨就诊汇总"),
                variable("priorBleeding", "既往出血", "confounder", "boolean", "跨就诊汇总"),
                variable("heartFailure", "心力衰竭", "confounder", "boolean", "诊断映射"),
                variable("antiplateletUse", "合并抗血小板药", "confounder", "boolean", "索引日前后窗口"),
            ],
            "qualityIssues": [
                {"issueId": "QI-EGFR-001", "severity": "warning", "title": "肾功能存在缺失", "field": "egfr", "affectedRecords": sum(item["egfr"] is None for item in records), "resolution": "保留缺失标识，主分析使用预设插补策略并进行完整病例敏感性分析"},
                {"issueId": "QI-FOLLOWUP-001", "severity": "blocking", "title": "部分记录随访不足 30 天", "field": "followupDays", "affectedRecords": sum(item["followupDays"] < 30 for item in records), "resolution": "按预定义排除标准排除并保留纳排日志"},
                {"issueId": "QI-AGE-001", "severity": "blocking", "title": "部分记录年龄不满足研究人群", "field": "age", "affectedRecords": sum(item["age"] < 65 for item in records), "resolution": "按纳入标准排除并保留来源行号"},
            ],
            "analysisPlan": {
                "scriptName": "nvaf_doac_comparative.py",
                "scriptVersion": "1.0.0",
                "method": "描述性统计 + SMD + 稳定化 IPTW + Kaplan-Meier/log-rank + Cox 比例风险模型 + 亚组及敏感性分析",
                "outputs": ["研究对象纳排流程", "Table 1 基线特征与调整前后 SMD", "倾向评分重叠与权重诊断", "主要有效性/安全性结局 HR 与 95%CI", "Kaplan-Meier 曲线", "亚组森林图", "敏感性分析"],
            },
            "publicationProfile": {
                "institution": "HospitalAI 合成验证环境",
                "principalInvestigator": "待真实项目指定",
                "statistician": "统计师审核岗",
                "ethicsApproval": "真实研究上线前待审批或豁免",
                "registrationId": "DEMO-NVAF-DOAC-2026-01",
                "targetJournal": "药物流行病学或临床药学专业期刊（待立项确认）",
                "primaryEndpoint": "缺血性卒中或系统性栓塞；大出血",
                "secondaryEndpoints": ["全因死亡", "再入院", "换药或停药"],
                "exposureDefinition": "索引日首次处方阿哌沙班或利伐沙班，按预设洗脱期识别新使用者",
                "confounders": ["年龄", "性别", "肾功能", "高血压", "糖尿病", "既往卒中", "既往出血", "心衰", "抗血小板药"],
                "statisticalSoftware": "Python 固定分析流水线（版本随成果包锁定）",
                "reportingGuideline": "STROBE + RECORD",
            },
            "reportTemplate": {
                "title": "老年房颤患者两种直接口服抗凝药比较研究数据分析报告",
                "limitations": ["合成数据仅用于流程验证", "回顾性观察研究存在残余混杂", "结局定义依赖数据源编码质量", "真实研究需完成伦理、统计和医学审核"],
                "applicability": "仅适用于本研究协议定义的人群、暴露、结局和观察窗口。",
            },
        },
    }
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(serialized, encoding="utf-8")
        print(f"generated {output} with {COUNT} synthetic records")


if __name__ == "__main__":
    main()
