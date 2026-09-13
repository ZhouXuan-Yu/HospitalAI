# 报告生成与审核页面 API

## 接口

- `POST /api/research/cohorts/{cohortId}/reports`：创建报告草稿，前端函数 `createResearchReport()`。
- `GET /api/research/cohorts/{cohortId}/reports`：读取报告版本。
- `POST /api/research/reports/{reportId}/review`：提交审核意见，前端函数 `reviewResearchReport()`。

审核请求：

```json
{ "reviewNote": "已核对暴露定义、模型诊断和结论边界" }
```

角色来自 `X-HospitalAI-Role`，依次为 `pharmacist -> statistician -> medical_lead`。生产后端需扩展独立 `ResearchReportReview` 记录，拒绝跳级、重复角色和客户端传入审核人。

状态：`draft -> in_review -> pharmacist_reviewed -> statistician_reviewed -> approved_frozen`。报告必须绑定 `datasetVersion/analysisRunId/reportHash`；上游失效后禁止继续审核或导出。
