# 企业级医学科研工作台技术设计

## 架构原则

- Spring Boot 是项目、数据版本、权限、状态、审核、审计和成果清单的唯一权威。
- FastAPI 只运行确定性数据处理与统计程序，不改变正式业务状态。
- Vue 按研究阶段组织页面，通过业务 API 恢复真实持久化状态。
- Excel 是首期输入适配器，内部研究模型不依赖供应商字段。
- 原始文件、标准化数据、冻结快照、分析、报告和成果包均不可原地覆盖。

## 数据流

```text
ResearchProject/Protocol
 -> DataSource + ImportJob + SourceFile
 -> StandardizedSubjectRecords
 -> Cohort + VariableDictionary + QualityCheck
 -> FrozenDatasetVersion
 -> StatisticalPlan + AnalysisRun/Task
 -> Results + Tables/Figures
 -> ReportDraft + Three-level Reviews
 -> ExportPackage + Manifest + AuditEvents
```

## 核心模型

| 模型 | 关键字段 |
|---|---|
| `ResearchProject` | title, templateCode, PICO, owner, syntheticFlag, protocolVersion, ethicsRef, status, rowVersion |
| `ResearchDataSource` | projectId, type, sourceSystem, adapterVersion, mappingVersion, syntheticFlag |
| `ResearchImportJob` | fileId, idempotencyKey, status, rowCounts, fileHash, errorArtifactId |
| `ResearchSubjectRecord` | studySubjectId, sourceRow, exposure, demographics, dates, outcomes, covariates, missingFlags, rowHash |
| `ResearchCohort` | inclusion/exclusion, exposureDefinition, outcomeDefinitions, version, status |
| `ResearchVariable` | code, type, unit, values, sourceField, transformRule, missingPolicy, role |
| `ResearchQualityCheck` | datasetCandidateId, rulesVersion, summary, issueCounts, status |
| `ResearchDatasetVersion` | cohortId, version, recordCount, schemaHash, contentHash, frozen metadata, invalidation metadata |
| `ResearchStatisticalPlan` | estimand, methods, covariates, validationPlan, version, statisticianReview |
| `ResearchAnalysisRun` | datasetVersionId, planVersionId, codeVersion, environmentHash, status, resultHash |
| `ResearchReportDraft` | analysisRunId, version, artifactId, status, syntheticDisclaimer |
| `ResearchReportReview` | reportId, stage, decision, comments, reviewer identity/time, reportHash |
| `ResearchExport` | reportId, datasetVersionId, artifactId, manifestHash, status |

首期研究记录使用类型化列，并保留来源行、映射版本和行哈希；扩展变量可用受控 JSON 补充，但不得以无结构 JSON 代替核心字段。

## Excel 契约

版本 `hospitalai.research-import.nvaf-doac.v1`，包含：

- `manifest`：版本、生成时间、合成标识、字典版本、随机种子、行数。
- `subjects`：一行一个去标识化研究对象。
- `dictionary`：编码、名称、类型、单位、取值域、缺失策略、来源。

核心字段包括研究对象 ID、年龄、性别、索引日期、暴露组、剂量分类、随访天数、卒中/栓塞、大出血、死亡、再入院、换药/停药、eGFR、肌酐、体重、主要共病和抗血小板药使用。

导入流程：文件检查 -> 暂存解析 -> 代码映射 -> 行级规则 -> 汇总预览 -> 事务发布。阻断错误导致整个批次不发布。

## 状态机

```text
draft -> protocol_review -> approved -> data_imported -> quality_checked
-> dataset_frozen -> analysis_queued -> analysis_running -> analysis_completed
-> report_draft -> pharmacist_reviewed -> statistician_reviewed
-> medical_lead_approved -> package_ready
```

失败态包括 `import_failed`、`quality_failed`、`analysis_failed`、`review_rejected` 和 `package_failed`。修订产生新版本；上游变更使下游状态变为 `invalidated`。

## API

前缀 `/api/research`，写请求携带 `Idempotency-Key`，开发环境通过 `X-HospitalAI-Role` 校验角色。

| 页面 | 主要接口 |
|---|---|
| 选题 | projects CRUD、提交、协议审核 |
| 导入 | 上传、状态、错误报告、发布、示例模板 |
| 队列质控 | cohorts、quality-checks、freeze、lineage |
| 分析 | analysis-plans、analysis-runs、results |
| 报告 | reports、reviews、preview、review-history |
| 导出 | exports、manifest、download |

Java 与 Python 通过版本化 `/v1/research/statistics/run` 契约通信。请求引用冻结数据哈希、统计计划和算法配置；响应返回结果、诊断、警告、表图索引、环境和结果哈希。

## 统计设计

固定配置 `nvaf-doac-comparative-effectiveness.v1`：

1. 连续变量按分布输出均值/标准差或中位数/IQR；分类变量输出 n/%。
2. 输出调整前后 SMD。
3. 逻辑回归倾向评分 + 稳定化 IPTW，检查重叠、极端权重和有效样本量。
4. Kaplan-Meier、log-rank、Cox，报告 HR、95% CI、P 值和 PH 假设诊断。
5. 年龄、性别、肾功能、既往卒中/出血亚组报告交互检验。
6. 权重截尾、替代随访窗口、完整病例与预设缺失策略做敏感性分析。
7. 先报告缺失机制和比例，高缺失变量触发阻断或警告，策略写入统计计划。

统计程序固定随机种子、依赖和算法版本。合成数据预设仅用于验证，不得解释为临床发现。

## 报告与成果包

报告包含项目信息、摘要、背景、目的、设计、数据源、人群、变量、统计方法、质量、基线、结局、诊断、亚组、敏感性、讨论、局限性、结论、伦理、可复现性和审核签名。

ZIP 包含清洗 CSV/XLSX、数据字典、纳排日志、质量报告、SAP、结果 JSON/CSV、PNG 图、Python 代码、依赖锁、DOCX/PDF 报告、审计/血缘、README、`manifest.json` 和 `checksums.sha256`。

## 安全与可靠性

- 检查 MIME、扩展名、文件大小、压缩炸弹、宏、公式和路径；防止 CSV/Excel 公式注入。
- 只使用研究 ID；导出前扫描直接标识符和自由文本。
- 审核身份来自认证上下文；审计只追加且无删除接口。
- PostgreSQL 任务表采用租约、重试、死信和幂等结果写入。
- 导入发布、冻结、审核和打包状态事务化；对象写入采用临时对象加确认。
- 所有成果记录输入哈希、代码版本、环境、配置、操作者和时间。

## 前端体验

- 第一屏显示项目、阶段、阻断事项和下一步，不宣传模型。
- 五阶段导航；工作区配可收纳项目上下文和按需详情面板。
- 长任务显示真实进度、日志摘要、取消/重试，刷新后从 API 恢复。
- 表格承载队列、变量、问题和统计结果；图表点击可查看口径和来源。
- 导入、报告、导出全程保留合成数据标识。

## 复用现状

复用已有 cohort、variable、quality-check、analysis-run/task、report、export 和 FastAPI statistics 能力；增量补齐 project、source/import、dataset version、SAP、三级审核和成果清单。现有前端预览数据不得作为生产链路数据源。
