# 队列与数据质量页面 API

## 接口

- `POST /api/research/cohorts/{cohortId}/variables`：保存变量定义，前端函数 `saveResearchVariable()`。
- `POST /api/research/cohorts/{cohortId}/quality-check`：执行质量检查，前端函数 `runResearchQualityCheck()`。
- `POST /api/research/cohorts/{cohortId}/freeze`：冻结队列，前端函数 `freezeResearchCohort()`。
- `GET /api/research/cohorts/{cohortId}/variables`：读取变量字典。

变量请求字段：`variableId/name/definition/sourceTable/missingPolicy/version`。

质控响应字段：`checkId/cohortId/status/totalSubjects/missingSummary/issueSummary/checkedAt`。`status` 非通过态时前端必须禁止冻结。

冻结要求：协议已批准、变量已确认、阻断问题清零；响应必须包含冻结状态和时间。生产扩展应增加 `datasetVersion/contentHash/schemaHash/rowVersion`，重复幂等请求返回同一冻结版本。
