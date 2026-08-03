# HospitalAI 模块实现路径与需求追踪矩阵

文档版本：V0.4  
更新时间：2026-08-03

| 编号 | 模块 | 用户价值 | 关键需求 | 当前状态 | 实现路径 | 必测场景 |
|---|---|---|---|---|---|---|
| R-001 | 真实数据接入 | 医生看到可信患者事实 | HIS/EMR/LIS/目录/SSO 适配器、映射版本、同步游标 | 部分完成：HIS snapshot 导入、inbound event、同步游标、工作列表已通；在线 HIS/SSO 待接 | `HisSnapshotImportService`、`contracts/openapi/his-adapter.v1.yaml` | 正常快照已测；缺字段、旧版本、重复事件、接口失败待扩展 |
| R-002 | 统一医疗模型 | 同一患者跨就诊不复制 | PatientProfile、Encounter、科室参与、来源映射 | 部分完成：导入器写入患者、就诊、目录和来源映射；完整跨科室参与导入待补 | `patient-context` 模块、`db/migration/V1__baseline_schema.sql` | 多次入院、转科、会诊、跨科室摘要 |
| R-003 | 安全规则 | 阻断高风险推荐 | 过敏、ADR、重复、冲突、缺失 | 最小雏形 | `rules` 模块、`clinical_rule` 表 | 过敏 100% 阻断、超级管理员不可绕过 |
| R-004 | 剂量计算 | 避免 AI 自由生成剂量 | 确定性计算器、单位、上下限、特殊人群 | 缺口 | `dose` 模块 | 肾功能缺失、老人、单位异常、上限超出 |
| R-005 | 药品目录 | 候选来自院内可用目录 | 目录版本、状态、适应范围 | 部分完成：快照导入器可 upsert 目录；目录版本和适应范围待补 | `drug_catalog`、目录导入器 | 停用药不能作为正常候选 |
| R-006 | 证据中心 | 推荐理由可追溯 | 文件、解析、审核、发布、撤回 | 演示证据 | `evidence` 模块、AI 解析/检索 | 未审核不得参与推荐、证据定位 |
| R-007 | 推荐流水线 | 形成可比较方案 | 固定流水线、候选、排除、解释 | 纵向切片已通 | `recommendation` 模块 | AI 失败降级、证据不足不补写 |
| R-008 | 医生审核 | 保留最终决策权 | 采纳、修改、驳回、差异、理由 | 已有雏形 | `decision` 模块、Web 矩阵 | 修改前后差异、驳回无草稿 |
| R-009 | 药师复核 | 高风险闭环处理 | 审方队列、沟通、处理结果 | 缺口 | `pharmacist-review` 模块 | 阻断、强提醒、跨科室协同 |
| R-010 | HIS 草稿回写 | 不写正式医嘱但可落地 | 幂等、失败、重试、最终回调 | 模拟草稿 | `prescription-draft`、HIS adapter | 重复提交、接口失败、状态回调 |
| R-011 | 长期追踪 | 历史风险继承 | 用药事件链、反馈、出院、再入院 | 缺口 | `medication-timeline` | 二次入院继承、换药原因 |
| R-012 | 科研数据 | 支撑报告草稿 | 队列、变量、数据质量、冻结 | 缺口 | `research` 模块 | 缺失统计、版本复现、脱敏导出 |
| R-013 | 知识审核 | 防止未审核结论反哺 | 多人审核、发布、撤回 | 缺口 | `knowledge-review` | 未审核不可引用 |
| R-014 | 权限与审计 | 医院合规 | OIDC、票据、RBAC/ABAC、审计不可删 | 开发放行 | `security`、`audit` | 越权、票据重放、审计删除失败 |
| R-015 | 异步任务 | 可靠处理解析/Embedding | PostgreSQL 任务表、租约、重试、死信 | 缺口；已先建立入站事件状态表 | `async-job`、Java/Python Worker | Worker 崩溃恢复、幂等 |
| R-016 | 运维交付 | 可上线运行 | Compose、监控、备份、恢复、压测 | 基线初步；Flyway 迁移已加入 | `infra/otel`、`infra/backup` | 容灾恢复、性能压测 |

## 端到端主链路

真实接口数据或模拟导入数据进入统一模型后，必须走同一条链路：

```text
Connector/Importer
  -> SourceIdentifierMapping + InboundEvent
  -> Patient Context Projection
  -> Rule Execution
  -> Evidence Retrieval
  -> Candidate Generation
  -> Doctor Decision
  -> Pharmacist Review when needed
  -> Prescription Draft Adapter
  -> Final HIS Status Callback
  -> Medication Timeline
  -> Research Dataset Candidate
```

禁止 UI、AI Service 或测试脚本绕过 Core API 直接生成业务状态。
