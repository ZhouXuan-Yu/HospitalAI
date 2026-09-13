# 选题与方案页面 API

## 页面目标

保存研究问题、PICO、纳排、结局、观察窗口和伦理状态，形成不可覆盖的协议版本。

## 当前可联调接口

`POST /api/research/cohorts`

```json
{
  "cohortId": "COHORT-NVAF-DOAC-v1",
  "name": "老年房颤 DOAC 比较队列",
  "diseaseScope": "65岁及以上非瓣膜性房颤",
  "inclusionCriteria": "age>=65; NVAF; new user; followup>=30d",
  "exclusionCriteria": "valvular AF; insufficient washout; missing exposure"
}
```

响应为 `ResearchCohortSummary`，状态初始为 `draft`。前端函数：`createResearchCohort()`。

## 保留契约

- `POST /api/research/projects`
- `GET /api/research/projects/{projectId}`
- `POST /api/research/projects/{projectId}/submit`
- `POST /api/research/projects/{projectId}/reviews`

项目接口需返回 `projectId/protocolVersion/status/ethicsRef/owner/rowVersion`。协议变更必须使数据集、分析、报告和导出失效，并产生审计事件。

权限：药师可编辑草稿；统计师审核统计计划；医学负责人批准研究方案；管理员不得代替审核。
