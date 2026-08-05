# 药师与知识库工作台接入真实数据链路

## Goal

将 `PharmacistReviews.vue`(风险复核队列)和 `KnowledgeReviews.vue`(知识审核中心)从 mock/演示数据切换到 Core API 真实端点,补充前端缺失的 API 封装,使两个工作台显示正式数据库状态而非模拟数据。

## Background

- 后端端点已存在:`/pharmacist/reviews`、`/pharmacist/reviews/{id}/resolve`、`/collaboration/tasks`、`/collaboration/tasks/{id}/resolve`、`/adr/reviews`、`/adr/reviews/{id}/resolve`、`/knowledge/submissions`、`/knowledge/submissions/{id}/reviews`(见 `WorkbenchController.java` 与 `coreApi.ts`)。
- 前端 `coreApi.ts` 已封装 ADR 与知识审核,但**缺** `pharmacist reviews`、`collaboration tasks` 封装。
- `PharmacistReviews.vue` 当前用 `mockApi.ts` → `data/pharmacist.json`。
- `KnowledgeReviews.vue` 当前用 `flowSimulation` store 演示状态,未接 `fetchKnowledgeSubmissions`/`reviewKnowledgeSubmission`。
- 医学边界:工作台展示真实队列,但**阻断风险不能被任何角色绕过**,工作台操作必须走角色头且保留审计。

## Requirements

### R1: coreApi.ts 补充缺失封装

- 新增 `fetchPharmacistReviews(status?)` → GET `/api/pharmacist/reviews`。
- 新增 `resolvePharmacistReview(reviewId, resolution)` → POST `/api/pharmacist/reviews/{id}/resolve`(角色 `pharmacist`)。
- 新增 `fetchCollaborationTasks(status?)` → GET `/api/collaboration/tasks`。
- 新增 `resolveCollaborationTask(taskId, resolution)` → POST `/api/collaboration/tasks/{id}/resolve`(角色 `pharmacist`)。
- 响应类型需与后端 `PharmacistReviewTaskSummary` / `CollaborationTaskSummary` 对齐(可在 `Dto.java` 中确认字段)。
- 复用现有模式:裸 fetch + `if (!response.ok) throw new Error('中文错误')` + `roleHeaders` / `jsonRoleHeaders`。

### R2: PharmacistReviews.vue 接入真实数据

- 替换 `mockFetchPharmacistReviews()` 为 `fetchPharmacistReviews()`。
- 列表/详情/队列 tab 显示真实队列数据。
- "完成复核"按钮调用 `resolvePharmacistReview(reviewId, resolution, resolutionNote)`。
- 跨科室协同入口调用 `fetchCollaborationTasks()` 与 `resolveCollaborationTask()`。
- 保持"打开患者决策台"跳转、风险三级展示、沟通记录(如后端无对应端点则明确降级/标记)。

### R2.1: 后端 pharmacist/collaboration 查询补 join(已确认)

后端 `PharmacistReviewTaskSummary` / `CollaborationTaskSummary` 缺页面展示字段,须补 join:

- `pharmacist_review_task` JOIN `encounters`(department, diagnosis)JOIN `patients`(display_name, sex, age),可再 JOIN `medication_order`(drug_name)。
- `collaboration_task` JOIN `encounters` / `patients` 补患者名与科室。
- DTO 增加展示字段:`patientName`、`patientId`、`sex`、`age`、`department`、`diagnosis`、`drugNames`(药师 review)。
- `WorkbenchRepository` 对应查询改为 join SQL。
- 前端类型同步。

### R3: KnowledgeReviews.vue 接入真实数据

- 替换 flowSimulation 演示数据为 `fetchKnowledgeSubmissions()`。
- "批准下一角色"调用 `reviewKnowledgeSubmission(submissionId, nextRole, 'approve', note)`。
- "退回修改"/"不通过"调用 `reviewKnowledgeSubmission(..., 'reject', note)`。
- 双角色审核计数取真实 `reviews` 状态。

### R4: 降级与边界

- 当 `VITE_UI_PREVIEW==='true'` 或 Core API 不可用时,保留现有 mock/演示降级,界面明确标识"演示数据"。
- 集成模式(`VITE_UI_PREVIEW!=='true'`)下,工作台必须显示真实数据库状态,不得混用 mock。
- 医学边界标识("演示证据/未发布")在降级模式下必须保留。

## Non-Requirements

- 不新增后端端点(现有端点已足够,除非验收中发现缺失字段)。
- 不重构 PharmacistReviews 的 UI 布局(任务只做数据接入)。
- 不做自动定时 Worker 调度(那是另一任务)。
- 不接真实医院 HIS。

## Acceptance Criteria

- [ ] `coreApi.ts` 新增 4 个 API 封装,与后端响应结构对齐,遵循现有错误处理模式。
- [ ] 后端 pharmacist/collaboration 查询补 join,DTO 返回 patientName/sex/age/department/drugNames 等展示字段。
- [ ] `PharmacistReviews.vue` 在集成模式显示真实队列,完成复核调用真实 resolve 端点并产生审计。
- [ ] `KnowledgeReviews.vue` 在集成模式显示真实知识提交,批准/退回调用真实 review 端点。
- [ ] 角色头正确:`pharmacist` 操作携带 `X-HospitalAI-Role: pharmacist`。
- [ ] 降级模式保留演示数据并明确标识,集成模式不混用 mock。
- [ ] `vue-tsc --noEmit` 通过。
- [ ] 后端编译与现有测试通过(含 join 后新字段不破坏原断言)。
- [ ] Vitest 测试覆盖新增封装(至少 mock fetch 的 4 个新函数)。
- [ ] Playwright 1366 与 1920 两视口通过,页面无溢出。

## Files

- `services/core-api/src/main/java/com/hospitalai/core/model/Dto.java`(DTO 加展示字段)
- `services/core-api/src/main/java/com/hospitalai/core/repository/WorkbenchRepository.java`(join SQL)
- `apps/web/src/services/coreApi.ts`(新增封装 + 类型)
- `apps/web/src/views/PharmacistReviews.vue`(数据接入)
- `apps/web/src/views/KnowledgeReviews.vue`(数据接入)
- `apps/web/tests/`(新增封装测试)

## Notes

- 医学安全:药师复核是硬规则后的强提醒环节,阻断结果不能因前端改动而失效。
- 前端 spec 约定见 `.trellis/spec/frontend/index.md`:页面结构、降级链、命名、`data-testid`。
