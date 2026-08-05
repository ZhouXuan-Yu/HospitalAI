# Implement: 药师与知识库工作台接入真实数据链路

## 执行顺序

按依赖排序,每步完成后运行对应验证。

### Step 1: 后端 DTO 加字段

**文件**: `services/core-api/src/main/java/com/hospitalai/core/model/Dto.java`

- `PharmacistReviewTaskSummary` 增加 patientId/patientName/sex/age/department/diagnosis/drugNames。
- `CollaborationTaskSummary` 增加 patientName/department。

**验证**: `cd services/core-api && mvn -q compile`(应通过)

### Step 2: 后端查询补 join

**文件**: `services/core-api/src/main/java/com/hospitalai/core/repository/WorkbenchRepository.java`

- `pharmacistReviews(status)` SQL 改 join `encounters`/`patients`/`medication_order`,返回新字段。
- `collaborationTasks(status)` 改 join。
- RowMapper 同步新字段位置。

**验证**: `mvn -q compile`;`mvn test`(现有测试可能因字段序变化失败,需同步修测试断言)

### Step 3: 前端 coreApi 类型对齐 + 已加封装

**文件**: `apps/web/src/services/coreApi.ts`

- `PharmacistReviewTaskSummary` / `CollaborationTaskSummary` 类型与后端一致(封装已加,需核对字段名)。

**验证**: `cd apps/web && npx vue-tsc --noEmit`

### Step 4: dataAccess 层接真实

**文件**: `apps/web/src/services/dataAccess.ts`

- `loadPharmacistReviews()` 改为 isPreview ? mock : realFetch(带 catch 降级)。
- 需要 map 后端扁平 record → 页面聚合结构(或返回后端结构,页面适配)。

### Step 5: PharmacistReviews.vue 接入

**文件**: `apps/web/src/views/PharmacistReviews.vue`

- 用 `loadPharmacistReviews` 替换 mock。
- priority → level 映射。
- 完成复核调 `resolvePharmacistReview`。
- 协同任务区调 `fetchCollaborationTasks` / `resolveCollaborationTask`。

### Step 6: KnowledgeReviews.vue 接入

**文件**: `apps/web/src/views/KnowledgeReviews.vue`

- 用 `fetchKnowledgeSubmissions` 替换 flowSimulation。
- 批准/退回调 `reviewKnowledgeSubmission`。
- 双角色计数确认(见 design 风险节)。

### Step 7: 测试

- `apps/web/tests/coreApi.test.ts` 或既有测试文件:mock fetch 覆盖 4 个新函数。
- 后端若有对应测试,补 join 字段断言。
- 跑 `npx vitest run`。

### Step 8: 验证

- `npx vue-tsc --noEmit`。
- `mvn test`。
- 若可能:`npm run e2e`(Playwright 两视口)。

## 回滚点

- 每步独立可回滚:DTO/join(Step1-2)单独 revert 不影响前端;前端(Step3-6)单独 revert。
- 若 H2 join 失败,回退 SQL 为原查询 + 前端字段降级显示(design 风险节)。

## Review Gate

Step 5/6 完成后,先自查规范(前端 index.md + 医学安全),再跑测试,最后报告验收。
