# 前端重塑实现追踪补充

| 需求 | 前端落点 | 后端数据边界 | 验收证据 |
|---|---|---|---|
| 横向模块导航 | `apps/web/src/layouts/AppShell.vue` | 路由与角色权限 | 1366/1920 视口截图，角色过滤 |
| 可收起左侧工作范围 | `AppShell.vue` + `product.css` | 科室/患者范围由身份与 API 返回 | 展开/收起不遮挡主任务 |
| 医生处方推荐 | `PatientWorklist.vue`、`DoctorWorkbench.vue` | `/api/worklist`、`/api/workbench/{encounterId}`、决策接口 | 候选、硬阻断、决策、草稿状态连续 |
| 药师处方审核 | `PharmacistReviews.vue` | `/api/pharmacist/reviews`、resolve、协同任务 | 单医嘱/联合用药、长期医嘱、审核记录 |
| 处方点评 | `PharmacyWorkbench.vue` `/pharmacy/retrospective` | timeline/outcome/research API | 样本、缺失、统计阈值和结论边界 |
| 药历 | `PharmacyWorkbench.vue` `/pharmacy/records` | 专用 medication-record API 待后端补齐 | 自动事实与手工补充分离，草稿可审计 |
| 用药教育 | `PharmacyWorkbench.vue` `/pharmacy/education` | 专用 medication-education API 待后端补齐 | 内容生成后进入药师审核，不直接发送 |
| 科研 ZIP + 医学报告 | `ResearchWorkbench.vue` | research export/report/artifact API | 数据包、报告、哈希、审阅状态 |
| 知识审核 | `KnowledgeReviews.vue` | knowledge submission/review API | 多人审核、发布/撤回、审计 |

## 当前实现边界

- 页面构建已完成，生产模式的正式事实、规则、推荐、审核和科研资源必须走 Core API。
- JSON 场景仅通过 `VITE_UI_PREVIEW=true` 和 JSON Schema 校验启用，数据显式标记为验证场景。
- 药历和用药教育页面已完成前端流程骨架，但专用后端接口尚未存在时必须显示“接口未就绪”，不可用内置假数据冒充生产成功。
- 1366 像素宽度默认收起左侧工作范围，1920 像素宽度可展开左侧范围与右侧页面详情。
