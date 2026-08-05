# Design: 药师与知识库工作台接入真实数据链路

## Context

- 后端已有 `pharmacist_review_task` / `collaboration_task` 表与查询,但 summary record 缺页面展示字段。
- 前端 `coreApi.ts` 已封装 ADR/知识,缺 pharmacist/collaboration。
- 页面 `PharmacistReviews.vue` 用 mockApi;`KnowledgeReviews.vue` 用 flowSimulation。
- 数据流:前端 `dataAccess.ts` 是统一访问层,页面应依赖它。

## 数据流

```
PharmacistReviews.vue → dataAccess.loadPharmacistReviews()
  → coreApi.fetchPharmacistReviews() → GET /api/pharmacist/reviews
  → 后端 join: pharmacist_review_task ⋈ encounters ⋈ patients (+ medication_order)
KnowledgeReviews.vue → coreApi.fetchKnowledgeSubmissions() → GET /api/knowledge/submissions
```

## 后端改动(DTO + Repository)

### Dto.java

`PharmacistReviewTaskSummary` 增加展示字段:

```java
public record PharmacistReviewTaskSummary(
  String reviewId, String recommendationId, String decisionId, String encounterId,
  String patientId, String patientName, String sex, int age,
  String department, String diagnosis, List<String> drugNames,
  String status, String priority, String reason, String assignedRole,
  Instant createdAt, Instant resolvedAt, String resolution) {}
```

`CollaborationTaskSummary` 增加展示字段:

```java
public record CollaborationTaskSummary(
  String taskId, String recommendationId, String encounterId,
  String patientName, String department,
  String sourceDepartment, String targetDepartment,
  String status, String reason, Instant createdAt, Instant resolvedAt, String resolution) {}
```

### WorkbenchRepository.java

`pharmacistReviews(status)` SQL 改为 join:

```sql
SELECT t.review_id, t.recommendation_id, t.decision_id, t.encounter_id,
       e.patient_id, p.display_name, p.sex, p.age,
       e.department, e.diagnosis,
       COALESCE(array_agg(DISTINCT m.drug_name) FILTER (WHERE m.drug_name IS NOT NULL), '{}'),
       t.status, t.priority, t.reason, t.assigned_role,
       t.created_at, t.resolved_at, t.resolution
FROM pharmacist_review_task t
JOIN encounters e ON e.encounter_id = t.encounter_id
JOIN patients p ON p.patient_id = e.patient_id
LEFT JOIN medication_order m ON m.encounter_id = t.encounter_id
WHERE (? IS NULL OR ? = '' OR t.status = ?)
GROUP BY t.review_id, e.patient_id, p.display_name, p.sex, p.age, e.department, e.diagnosis
ORDER BY t.created_at DESC
```

`collaborationTasks(status)` 同理 join `encounters` + `patients` 补 patientName/department。

> 注意:查询需适配 H2(测试 profile)。`array_agg` 与 `FILTER` 在 H2 PostgreSQL 模式下支持;若 H2 报错,降级为 `GROUP_CONCAT` 或子查询取单药名。

## 前端改动

### coreApi.ts

- 类型 `PharmacistReviewTaskSummary` / `CollaborationTaskSummary` 与后端新 DTO 对齐。
- 新增 `fetchPharmacistReviews` / `resolvePharmacistReview` / `fetchCollaborationTasks` / `resolveCollaborationTask`(已做)。

### dataAccess.ts

- `loadPharmacistReviews()` 从纯 mock 改为:`isPreview()` → mock;否则 `coreApi.fetchPharmacistReviews()`(try/catch 降级)。

### PharmacistReviews.vue

- 替换 `mockFetchPharmacistReviews` 为 `loadPharmacistReviews`(来自 dataAccess)。
- 后端字段映射:mock 的 `patient` → `patientName`,`drugs` → `drugNames.join(', ')`,`department` → `department`,`level` → 由 `priority` 映射(urgent→danger, high→warning, normal→info)。
- "完成复核"调用 `resolvePharmacistReview`。
- 协同任务区调用 `fetchCollaborationTasks` / `resolveCollaborationTask`。
- 降级:Core API 失败 → catch 落 mock + el-alert 显示错误。

### KnowledgeReviews.vue

- 替换 flowSimulation 演示为 `coreApi.fetchKnowledgeSubmissions()`。
- 批准/退回调用 `reviewKnowledgeSubmission(submissionId, role, decision, note)`。
- 双角色计数取真实 `reviews`(需后端返回 reviews 数组;若没有,用状态 `review_pending` + 已有 review 判定)。

## 风险与兼容

- H2 测试 profile 的 join 兼容性是最大风险。若 `array_agg FILTER` 在 H2 失败,改用子查询 `(SELECT drug_name FROM medication_order ... LIMIT 1)` 或返回 `List<String>` 用 `;` 拼接字符串。
- 后端 record 字段增加会破坏前端旧类型编译 → 必须同步改 coreApi.ts 类型。
- `KnowledgeSubmissionSummary` 无 reviews 字段,双角色计数需确认。若不返回,前端用提交状态 + 调 review 后刷新推断。
