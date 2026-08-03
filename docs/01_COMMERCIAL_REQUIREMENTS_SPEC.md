# HospitalAI 商业级完整需求规格

文档版本：V0.4  
更新时间：2026-08-03  
状态：后续功能开发必须对齐本文件

## 1. 范围边界

本阶段从 MVP 纵向切片升级为可落地商业项目基线，但仍遵守医疗安全边界：

- 不自动诊断。
- 不自动开正式医嘱。
- 不让 AI 发布医学规则、确认过敏或生成确定性剂量。
- 不把模拟病例结果包装成科研结论。
- 不使用真实身份信息做云端模型调用。

## 2. 功能域

### 2.1 数据接入与统一模型

必须实现：

- HIS/EMR/LIS/药品目录/SSO 连接器接口。
- 字段映射版本管理。
- 患者主索引映射与人工合并队列。
- 实时快照、增量事件、轮询兜底和提交前版本复核。
- 数据来源、来源标识、采集时间、更新时间、缺失状态、审核状态。

实现路径：

- Core API：`services/core-api/src/main/java/com/hospitalai/core/integration`
- 数据表：`source_identifier_mapping`、`sync_cursor`、`inbound_event`、`patient_merge_queue`
- 契约：`contracts/openapi/his-adapter.v1.yaml`、`contracts/schema/his-event.v1.json`

### 2.2 患者药学上下文

必须实现：

- PatientProfile、Encounter、DepartmentParticipation。
- Diagnosis、LabResult、MedicationOrder、MedicationExposure。
- AllergyEvent、AdverseDrugReaction、MedicationFeedback、DischargeOutcome。
- 跨就诊、跨科室安全摘要。
- 原始事实和 AI 摘要分层展示。

实现路径：

- Core API：`patient-context` 模块。
- Web：`apps/web/src/views/DoctorWorkbench.vue` 扩展为上下文子组件。
- 测试：患者多就诊、多科室、缺失、冲突、旧版本更新。

### 2.3 确定性规则与剂量计算

必须实现：

- 过敏硬阻断。
- 严重 ADR 阻断或强提醒。
- 重复药物、重复药理类别、跨科室冲突。
- 药物目录约束。
- 关键检验缺失。
- 剂量计算器接口、单位换算、上下限和特殊人群规则。
- 规则草稿、审核、发布、失效、新版本和病例测试。

实现路径：

- Core API：`rules`、`dose` 模块。
- 数据表：`clinical_rule`、`rule_version`、`rule_case`、`rule_execution`。
- 测试：Java 单元测试、规则病例测试、边界病例测试。

### 2.4 证据资料中心与 RAG

必须实现：

- 文件上传、哈希、杀毒/类型检查、BlobStorage。
- DocumentBlock 解析输出。
- EvidenceChunk 切分、元数据、审核、发布、撤回。
- 元数据过滤、关键词检索、向量检索、重排序、定位引用。
- 未发布资料不得参与正式推荐。

实现路径：

- Core API：证据元数据、审核状态、权限。
- AI Service：解析、Embedding、检索、重排序。
- 数据表：`evidence_document`、`document_block`、`evidence_chunk`、`evidence_review`、`embedding_job`。
- 文件接口：`BlobStorage` 本地目录/NAS/S3 兼容实现。

### 2.5 推荐、审核与处方草稿回写

必须实现：

- 固定流水线：患者事实 -> 硬规则 -> 证据过滤 -> 检索 -> 候选排序 -> AI 解释草稿 -> 二次安全校验 -> 医生审核。
- 2 至 3 个候选方案、排除药物及原因。
- 医生采纳、修改、驳回。
- 修改前后差异。
- 药师复核队列。
- HIS 草稿回写、幂等键、失败重试、最终状态回调。
- 推荐过期与重新计算。

实现路径：

- Core API：`recommendation`、`decision`、`prescription-draft` 模块。
- AI Service：`/v1/evidence/retrieve`、`/v1/explanations/draft`。
- Web：候选矩阵、修改抽屉、风险处理弹窗、证据定位面板。

### 2.6 患者长期追踪

必须实现：

- 用药事件链。
- 开始、调整、暂停、停止、换药原因。
- 疗效反馈、不良反应、出院结局、复诊和再入院关联。
- 历史风险对当前推荐的影响链路。

实现路径：

- Core API：`medication-timeline` 模块。
- 数据表：`medication_event`、`medication_feedback`、`discharge_outcome`、`risk_inheritance_link`。
- Web：分段多轨时间线。

### 2.7 科研数据与报告

必须实现：

- 研究队列、纳排标准、变量字典、暴露定义、结局定义。
- 数据质量、缺失、异常、样本量。
- 数据集冻结、版本复现、二次脱敏。
- 固定 Python 统计代码。
- AI 仅生成报告草稿和解释。
- 报告审核、冻结、知识提交。

实现路径：

- Core API：`research`、`knowledge-review` 模块。
- AI Service：统计脚本执行和报告草稿。
- 数据表：`research_cohort`、`research_dataset_version`、`variable_dictionary`、`analysis_run`、`research_report`。

### 2.8 权限、安全与审计

必须实现：

- OIDC 优先，兼容 CAS/SAML/医院自有 SSO。
- 短期一次性上下文票据。
- RBAC + 科室/患者/就诊 ABAC。
- 超级管理员开发可用、生产默认禁用、不能绕过硬规则。
- 审计不可删除，导出/查看/修改/模拟均记录。

实现路径：

- Core API：`security`、`audit` 模块。
- 数据表：`user_account`、`role_assignment`、`access_policy`、`context_ticket`、`audit_log`。
- 测试：越权访问、票据重放、超级管理员绕过阻断失败。

### 2.9 运维、性能与可靠性

必须实现：

- PostgreSQL + pgvector 生产基线。
- 可靠任务表和 Worker 租约。
- OpenTelemetry trace/metrics/logs。
- 备份恢复、版本迁移、灰度升级、回滚。
- 压测、容量规划、慢查询治理。

实现路径：

- Infra：`infra/docker-compose.yml`、`infra/postgres`、`infra/otel`、`infra/backup`。
- Core API：`async-job`、`observability`。
- 验收：恢复演练、压测报告、故障注入。
