# HospitalAI 模块实现路径与需求追踪矩阵

文档版本：V0.4  
更新时间：2026-08-03

| 编号 | 模块 | 用户价值 | 关键需求 | 当前状态 | 实现路径 | 必测场景 |
|---|---|---|---|---|---|---|
| R-001 | 真实数据接入 | 医生看到可信患者事实 | HIS/EMR/LIS/目录/SSO 适配器、映射版本、同步游标 | 部分完成：HIS snapshot 导入、inbound event、同步游标、工作列表已通；在线 HIS/SSO 待接 | `HisSnapshotImportService`、`contracts/openapi/his-adapter.v1.yaml` | 正常快照已测；缺字段、旧版本、重复事件、接口失败待扩展 |
| R-002 | 统一医疗模型 | 同一患者跨就诊不复制 | PatientProfile、Encounter、科室参与、来源映射 | 部分完成：导入器写入患者、就诊、目录和来源映射；完整跨科室参与导入待补 | `patient-context` 模块、`db/migration/V1__baseline_schema.sql` | 多次入院、转科、会诊、跨科室摘要 |
| R-003 | 安全规则 | 阻断高风险推荐 | 过敏、ADR、重复、冲突、缺失 | 部分完成：规则元数据、规则病例和执行记录已落库；执行仍由 Java 确定性函数完成 | `rules` 模块、`clinical_rule` 表、`rule_execution` 表 | 过敏 100% 阻断、超级管理员不可绕过 |
| R-004 | 剂量计算 | 避免 AI 自由生成剂量 | 确定性计算器、单位、上下限、特殊人群 | 部分完成：`/api/dose/calculate` 从 published `dose_rule` 读取规则文本；缺规则时安全返回不可用 | `dose` 模块、`dose_rule` 表 | 肾功能缺失、老人、单位异常、上限超出 |
| R-005 | 药品目录 | 候选来自院内可用目录 | 目录版本、状态、适应范围 | 部分完成：快照导入器可 upsert 目录；目录版本和适应范围待补 | `drug_catalog`、目录导入器 | 停用药不能作为正常候选 |
| R-006 | 证据中心 | 推荐理由可追溯 | 文件、解析、审核、发布、撤回 | 部分完成：EvidenceDocument/DocumentBlock/EvidenceChunk 表、上传/解析/发布/撤回 API、published-only 检索和 FastAPI Core 证据读取已通；真实文件解析与审核 UI 待补 | `evidence` 模块、AI 解析/检索 | 未审核不得参与推荐、证据定位 |
| R-007 | 推荐流水线 | 形成可比较方案 | 固定流水线、候选、排除、解释 | 纵向切片已通 | `recommendation` 模块 | AI 失败降级、证据不足不补写 |
| R-008 | 医生审核 | 保留最终决策权 | 采纳、修改、驳回、差异、理由 | 部分完成：决策落库、推荐状态更新、阻断不可生成草稿、regimen diff 和数据版本过期已通；更细字段级 diff 待补 | `decision` 模块、Web 矩阵 | 修改前后差异、驳回无草稿 |
| R-009 | 药师复核 | 高风险闭环处理 | 审方队列、沟通、处理结果 | 部分完成：强提醒自动创建药师复核任务，跨科室协同任务独立建模，支持查询和解决；医生工作台右栏可查看并处理 ADR 待办；独立药师工作台和权限细化待补 | `pharmacist-review`、`collaboration-task`、Web 右栏待办 | 阻断、强提醒、跨科室协同 |
| R-010 | HIS 草稿回写 | 不写正式医嘱但可落地 | 幂等、失败、重试、最终回调 | 部分完成：草稿幂等键、可靠写入任务、失败重试状态、状态查询、HIS callback API 已通；真实 adapter Worker 待补 | `prescription-draft`、HIS adapter | 重复提交、接口失败、状态回调 |
| R-011 | 长期追踪 | 历史风险继承 | 用药事件链、反馈、出院、再入院 | 部分完成：`medication_timeline_event`、`medication_feedback`、`discharge_outcome` 表和 API 已通；严重反馈信号可生成 ADR 审核，确认后进入后续推荐强提醒，前端可处理 ADR 待办；再入院自动摘要和权限待补 | `medication-timeline`、`feedback`、`outcome`、`adr-review` API、Web 右栏待办 | 二次入院继承、换药原因、出院结局、严重 ADR 升级 |
| R-012 | 科研数据 | 支撑报告草稿 | 队列、变量、数据质量、冻结、统计、脱敏导出 | 部分完成：研究队列、变量字典、质量检查、冻结版本、统计任务、Java Worker HTTP 调用 FastAPI、统计运行记录、统计产物落盘、脱敏导出记录、导出文件落盘、artifact 回读和报告草稿审核 API 已通；下载权限和复现实验目录待补 | `research` 模块、`research_cohort`、`research_variable`、`research_dataset_quality_check`、`research_analysis_task`、`research_analysis_run`、`research_deidentified_export`、`research_report_draft` | 缺失统计、版本复现、脱敏导出、报告审核 |
| R-013 | 知识审核 | 防止未审核结论反哺 | 多人审核、发布、撤回 | 部分完成：已审核报告可提交知识候选，两类角色批准后发布，支持撤回和审计；前端右栏可处理知识待办并回读科研 artifact；正式知识库 UI、引用控制和知识分类权限待补 | `knowledge_submission`、`knowledge_submission_review`、Web 右栏待办 | 未审核不可引用、双人审核、发布撤回 |
| R-014 | 权限与审计 | 医院合规 | OIDC、票据、RBAC/ABAC、审计不可删 | 开发放行；导入、规则执行、推荐审核已有审计/执行记录，权限边界待增强 | `security`、`audit` | 越权、票据重放、审计删除失败 |
| R-015 | 异步任务 | 可靠处理解析/Embedding/统计 | PostgreSQL 任务表、租约、重试、死信 | 部分完成：入站事件状态表、处方草稿写入任务、科研统计任务、显式 Worker 处理、失败重试和死信状态已建立；后台定时调度、严格租约抢占和解析/Embedding 任务待补 | `async-job`、Java/Python Worker | Worker 崩溃恢复、幂等 |
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
