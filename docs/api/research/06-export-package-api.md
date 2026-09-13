# 数据导出与成果包页面 API

## 接口

- `POST /api/research/cohorts/{cohortId}/exports`：创建去标识导出，前端函数 `createResearchExport()`。
- `GET /api/research/cohorts/{cohortId}/exports`：查询导出记录。
- `GET /api/research/artifacts?uri={artifactUri}`：读取授权产物，前端函数 `fetchResearchArtifact()`。

请求字段：`requestedBy/purpose`。响应字段：`exportId/status/rowCount/artifactUri/dataHash/createdAt`。

完整成果包应包含分析 CSV/XLSX、数据字典、纳排日志、质量报告、统计计划、结果、图表、Python 代码、依赖锁、DOCX/PDF、审核记录、血缘、README、manifest 和 SHA-256 清单。

只有 `approved_frozen` 报告可以导出。服务端生成前必须执行直接标识符、自由文本和公式注入扫描；下载需鉴权并记录审计。当前前端演示使用 `researchArtifacts.ts` 在浏览器生成 ZIP/DOCX，生产部署必须迁移为服务端签名和不可变存储。
