# HospitalAI 前端-后端接口契约

> 版本：v1.0 · 维护边界：前端工作台与 Core API · 数据安全等级：医疗辅助决策

## 1. 契约原则

1. `contracts/openapi/core-api.v1.yaml` 是字段、状态码和请求体的权威来源；本文件说明页面如何使用这些接口。
2. 生产模式只允许通过 Core API 读取和写入。`VITE_UI_PREVIEW=true` 时才允许导入经过 JSON Schema 校验的合成场景，用于验收，不得进入生产数据库。
3. 医生的“采纳/修改/驳回”是推荐决策，不是正式医嘱；写回结果必须是 `prescriptionDraft`，不得伪装为正式状态。
4. 任何阻断规则由 Core API/Java 确定性执行，前端只展示结果，不能通过角色切换、参数修改或 UI 隐藏绕过。
5. 每个写操作都必须携带当前操作者身份、幂等键（由后端网关生成或校验）并落审计事件。

## 2. 公共约定

| 项目 | 约定 |
|---|---|
| Base URL | 前端同源 `/api`，医院部署由网关映射 |
| 身份 | OIDC/SSO 令牌；开发联调可使用 `X-HospitalAI-Role`，仅限开发环境 |
| 编码 | UTF-8 JSON，时间使用 ISO-8601 UTC |
| 分页 | 列表默认 `page`、`pageSize`，后端返回 `items/total/page/pageSize`；现有兼容列表可暂返回数组 |
| 错误 | `{ code, message, traceId, details? }`；前端必须展示 traceId 并保留原始错误状态 |
| 权限 | 医生按负责科室和患者范围；药师按审核科室；科研按脱敏研究集；管理员不能绕过医学阻断 |
| 来源 | 事实必须带 `source/sourceId/collectedAt/dataVersion/missingStatus` |

## 3. 页面到接口映射

### 3.1 医生：处方推荐

| 页面动作 | 方法与路径 | 请求 | 关键响应 | 状态衔接 |
|---|---|---|---|---|
| 加载患者列表 | `GET /api/worklist` | 科室、状态、分页、关键字 | `WorklistItem[]` | 患者项进入当前任务 |
| 打开推荐工作台 | `GET /api/workbench/{encounterId}` | 路径就诊号 | 患者、就诊、事实、硬规则、候选、证据、阶段状态 | `facts -> alerts -> candidates` |
| 采纳/修改/驳回 | `POST /api/recommendations/{recommendationId}/decision` | `action,candidateId,reason,modifiedRegimen?,riskHandling?` | `decisionId,prescriptionDraftId,draftStatus,pharmacistReviewId,auditEvents,blocked` | 推荐决策 -> 草稿 -> 药师待审 |
| 查看草稿状态 | `GET /api/prescription-drafts/{draftId}` | 路径草稿号 | 草稿版本、写回状态、回调状态 | 草稿不等于正式医嘱 |
| 模拟 HIS 回调 | `POST /api/prescription-drafts/{draftId}/callback` | 回调版本、结果、外部事件号 | 回调确认状态 | 仅适配器/测试服务可调用 |

提交规则：`blocked=true` 或候选 `blocked=true` 时，Core API 必须拒绝所有非驳回提交；前端不得自行把“拒绝”改成“采纳”。

### 3.2 药师：处方审核

| 页面动作 | 方法与路径 | 请求 | 关键响应 | 状态衔接 |
|---|---|---|---|---|
| 加载待审医嘱 | `GET /api/pharmacist/reviews` | `status=pending&departmentId&reviewDate&page` | 审核任务及患者、诊断、药品摘要 | 当日未审 + 未停用长期医嘱 |
| 单医嘱/联合审查 | `GET /api/workbench/{encounterId}` | 就诊号 | 同一患者事实、当前科室与跨科室用药、规则命中 | 单项与当日组合共用硬规则结果 |
| 通过/调整/退回 | `POST /api/pharmacist/reviews/{reviewId}/resolve` | `resolution,note,riskHandling` | 审核状态、后续动作、审计号 | `pending -> resolved/returned` |
| 跨科室协同 | `GET /api/collaboration/tasks` / `POST /api/collaboration/tasks/{taskId}/resolve` | 状态、处理结论、说明 | 协同任务状态与审计 | 不自动停用其他科室医嘱 |

批量审核只允许无阻断、无未确认异常且后端明确标记 `batchEligible=true` 的任务；前端双击患者或“查看患者详情”必须打开患者上下文，而不是直接完成审核。

### 3.3 处方点评、药历、用药教育

当前 Core API 已提供回顾性研究、患者反馈和用药结局接口。以下页面使用这些正式资源；药历和教育的专用写接口需由后端按本节补齐，页面在生产模式不可用时必须显示接口未就绪，不得退回内置假数据。

| 模块 | 读取 | 写入 | 必须保存 |
|---|---|---|---|
| 处方点评 | `GET /api/patients/{patientId}/timeline`、`GET /api/patients/{patientId}/outcomes` | `POST /api/patients/{patientId}/feedback` | 完整治疗周期、口服/注射等给药途径、点评人、证据、缺失项 |
| 药历 | 建议新增 `GET /api/medication-records?patientId&status` | 建议新增 `POST /api/medication-records`、`POST /api/medication-records/{id}/submit` | 自动导入事实与来源、访谈补充、调整原因、分析、重点患者标记、审计 |
| 用药教育 | 建议新增 `GET /api/medication-education?patientId&status` | 建议新增 `POST /api/medication-education`、`POST /api/medication-education/{id}/review` | 教育版本、患者可读内容、药师审核、发送状态、回执 |

药历月度目标（默认每名药师 2 份）与收费规则必须由医院配置中心提供；前端只显示配置值，不把产品默认值表述为国家强制规则。

## 4. 科研与知识接口

| 页面动作 | 方法与路径 | 请求/关键字段 | 结果 |
|---|---|---|---|
| 创建研究队列 | `POST /api/research/cohorts` | 纳排标准、时间窗、脱敏策略、抽样方法、随机种子 | 队列版本与快照 |
| 查看变量 | `GET/POST /api/research/cohorts/{cohortId}/variables` | 变量定义、单位、缺失编码 | 可追溯变量字典 |
| 质量检查 | `POST /api/research/cohorts/{cohortId}/quality-check` | 队列版本 | 缺失、冲突、重复、异常值报告 |
| 冻结数据集 | `POST /api/research/cohorts/{cohortId}/freeze` | 质量问题处理记录、确认人 | `datasetVersion,datasetHash` |
| 分析任务 | `POST/GET /api/research/cohorts/{cohortId}/analysis-tasks` | 统计计划、脚本版本、输入哈希 | 可靠任务状态与重试信息 |
| 执行分析 | `POST /api/research/analysis-tasks/process-next` | Worker 身份 | 固定脚本输出，不由模型生成 P 值 |
| 导出数据包 | `POST/GET /api/research/cohorts/{cohortId}/exports` | 导出范围、二次去标识化、清单 | ZIP URI、SHA-256、manifest |
| 生成报告 | `POST/GET /api/research/cohorts/{cohortId}/reports` | 章节、统计结果引用、作者与版本 | 可审阅报告草稿 |
| 报告审核 | `POST /api/research/reports/{reportId}/review` | `decision,note` | 草稿 -> 审核中 -> 冻结 |
| 提交知识审核 | `POST /api/knowledge/submissions` | 报告/数据包版本、来源哈希 | `review_pending` |
| 多人审核知识 | `POST /api/knowledge/submissions/{submissionId}/reviews` | 审核人角色、结论、说明 | 发布/驳回及审计 |

研究报告下载必须同时提供：去标识化 ZIP、`manifest.json`、数据字典、分析脚本/版本、统计输出、缺失说明、纳排标准、样本量、数据来源、审阅记录及哈希。`P < 0.05` 不能单独生成“某药适合某患者”的医学结论，必须连同效应量、置信区间、混杂因素、敏感性分析和适用边界由专业人员审核。

## 5. 规则与证据

规则使用 `GET/POST /api/rules`，发布链路依次调用 `submit-review -> publish`；撤回使用 `withdraw`。证据使用 `GET/POST /api/evidence/documents`、解析、发布和撤回接口。未发布资料前端必须显示“演示证据/未发布”，不能参与正式推荐。

## 6. 前端错误与可观测性

- `401/403`：清除本页可编辑状态，保留只读事实，并显示权限原因。
- `409`：显示版本冲突，重新读取后要求用户确认，禁止静默覆盖。
- `422`：显示字段级校验和规则命中事实。
- `503/504`：显示服务降级；患者事实和 Java 硬规则结果仍可用，AI 解释显示“解释服务降级”。
- 每次写操作在结果区显示 `decisionId/draftId/auditEventId/traceId`，并允许进入审计日志。

## 7. 后端交付验收

后端完成本契约后，应以 OpenAPI 契约测试、权限矩阵测试、幂等测试、并发版本测试、硬规则不可绕过测试和脱敏导出哈希校验作为合并门禁。若专用药历/教育接口尚未实现，相关页面只能处于“接口未就绪”状态，不能以 mock 响应冒充完成。
