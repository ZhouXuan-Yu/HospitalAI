# 前端重塑实现追踪补充

| 需求 | 前端落点 | 后端数据边界 | 验收证据 |
|---|---|---|---|
| 横向模块导航 | `apps/web/src/layouts/AppShell.vue` | 路由与角色权限 | 1366/1920 视口截图，角色过滤 |
| 药师核心模块直达 | `AppShell.vue` | `/pharmacy/reviews`、`/pharmacy/retrospective`、`/pharmacy/records`、`/pharmacy/education` | 药师角色可从统一顶栏直接进入审核、点评、药历和教育 |
| 可收起左侧工作范围 | `AppShell.vue` + `product.css` | 科室/患者范围由身份与 API 返回 | 展开/收起不遮挡主任务 |
| 医生处方推荐 | `PatientWorklist.vue`、`DoctorWorkbench.vue` | `/api/worklist`、`/api/workbench/{encounterId}`、决策接口 | 候选、硬阻断、决策、草稿状态连续 |
| 药师处方审核 | `PharmacistReviews.vue` | `/api/pharmacist/reviews`、resolve、协同任务 | 单医嘱/联合用药、长期医嘱、审核记录 |
| 处方点评 | `PharmacyWorkbench.vue` `/pharmacy/retrospective` | timeline/outcome/research API | 样本、缺失、统计阈值和结论边界 |
| 药历 | `PharmacyWorkbench.vue` `/pharmacy/records` | 专用 medication-record API 待后端补齐 | 自动事实与手工补充分离，草稿可审计 |
| 用药教育 | `PharmacyWorkbench.vue` `/pharmacy/education` | 专用 medication-education API 待后端补齐 | 内容生成后进入药师审核，不直接发送 |
| 科研 ZIP + 医学报告 | `ResearchWorkbench.vue` | research export/report/artifact API | 数据包、报告、哈希、审阅状态 |
| 知识审核 | `KnowledgeReviews.vue` | knowledge submission/review API | 多人审核、发布/撤回、审计 |

## 前端调试数据入口（仅 `VITE_UI_PREVIEW=true`）

- 顶部右侧提供“载入数据”：直接读取版本化 `/scenarios/cap-full-flow.v1.json`，写入前端 Pinia 状态与浏览器持久化，用于贯通处方推荐、处方审核、科研与知识页面的验证流程。
- 顶部右侧提供“清除数据”：清除当前浏览器会话的场景、决策、草稿、结局、科研分析、报告状态和审计验证状态；清除后页面必须显示空态，不自动恢复内置场景。
- JSON 图标入口仍支持导入外部场景包；所有导入内容先通过 `hospitalai.frontend-flow.v1` Schema 校验，失败时保留校验错误，不写入业务状态。
- 该入口只存在于预览构建，正式模式不加载内置场景、不展示调试按钮，也不改变 Core API 的真实数据链路。

## 医生工作台重塑（2026-08-10）

- 医生工作台路由使用沉浸式应用壳，隐藏重复的全局工作范围侧栏，保留顶部模块导航。
- 左侧默认收纳为患者上下文窄轨；展开后优先展示当前科室患者队列（最多 10 行），再查看患者事实与跨就诊安全摘要。
- 右侧默认收纳为风险/证据窄轨；点击安全审查、风险、证据或缺失项后推挤式展开，不覆盖中央任务。
- 中央第一屏聚焦五阶段决策进度、核心推荐、候选摘要和医生可执行动作；完整推理链、方案矩阵和药品组合说明默认折叠。
- 底部决策区使用粘性操作栏，持续区分“生成处方草稿”和正式医嘱，硬阻断时保持锁定状态。
- 截图验收：`apps/web/docs/validation/doctor-workbench-redesign-5180.png`。
- Core API 失败时医生页展示可操作错误态、原始接口错误和重新读取入口；不使用默认患者、规则或推荐替代真实数据。

## 药师审核页补充重塑（2026-08-10）

- 审核队列支持收起左侧任务列表，进入单任务聚焦模式；可通过窄化后的打开按钮恢复队列。
- 审核详情中的药品、审核原因和优先级来自当前任务响应；未随摘要返回的跨科室医嘱、规则版本和证据明确标为待详情接口加载。
- 不再在药师审核详情中使用固定药品组合、固定冲突事实或固定证据文案冒充真实业务数据。

## 当前实现边界

- 页面构建已完成，生产模式的正式事实、规则、推荐、审核和科研资源必须走 Core API。
- JSON 场景仅通过 `VITE_UI_PREVIEW=true` 和 JSON Schema 校验启用，数据显式标记为验证场景。
- 药历和用药教育页面已完成前端流程骨架，但专用后端接口尚未存在时必须显示“接口未就绪”，不可用内置假数据冒充生产成功。
- 1366 和 1920 使用同一前端项目：1366 仍保留患者/工作范围、主任务和安全审查的可用布局；当窗口低于 1280 像素时自动退化为窄轨，左右信息可按需展开。两种尺寸均为视口验收标准，不是两个前端项目。
- 药师点评、药历和用药教育在无真实数据时展示明确空状态，不显示固定患者或空表格；预览模式才显示 JSON 验证数据入口。
- 正式模式不展示固定验证用户、科室或患者范围；应用壳显示身份/授权范围待 Core API 返回，验证模式才展示合成场景范围。
