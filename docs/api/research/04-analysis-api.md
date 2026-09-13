# 算法分析页面 API

## 同步联调

`POST /api/research/cohorts/{cohortId}/analysis-runs`

```json
{
  "scriptVersion": "nvaf-doac-comparative.v1",
  "statisticPlan": "SMD + stabilized IPTW + KM/log-rank + Cox",
  "runner": "python-worker"
}
```

前端函数 `runResearchAnalysis()`。响应必须包含 `runId/status/inputHash/outputHash/resultSummary/artifactUri/startedAt/completedAt`。

## 异步接口

- `POST /api/research/cohorts/{cohortId}/analysis-tasks`
- `GET /api/research/cohorts/{cohortId}/analysis-tasks`
- `POST /api/research/analysis-tasks/process-next`
- `POST /api/research/analysis-tasks/{taskId}/mark-failed`

任务状态：`queued/processing/retry_scheduled/dead_letter/completed`。页面刷新后按 `taskId` 恢复进度。统计数值只能由固定 Python 程序生成；失败必须显示失败或降级，不能补写结果。
