# 科研工作台页面接口索引

本目录按前端页面记录科研纵向链路接口。演示模式通过 `flowSimulation` 使用同一领域对象并持久化到浏览器；生产模式通过 `coreApi.ts` 调用 Core API。合成 JSON 只用于验证，不得进入正式科研结论。

| 页面 | 文档 | 当前联调状态 |
|---|---|---|
| 选题与方案 | [01-topic-management-api.md](./01-topic-management-api.md) | 队列接口可用；项目接口为保留契约 |
| 数据提取 | [02-data-import-api.md](./02-data-import-api.md) | 前端 JSON 适配器可用；服务端上传为保留契约 |
| 队列质控 | [03-cohort-quality-api.md](./03-cohort-quality-api.md) | Core API 已有队列、变量、质控、冻结接口 |
| 算法分析 | [04-analysis-api.md](./04-analysis-api.md) | Core API 与任务 Worker 接口已存在 |
| 报告审核 | [05-report-review-api.md](./05-report-review-api.md) | 报告接口已存在；三级角色状态需后端扩展 |
| 成果导出 | [06-export-package-api.md](./06-export-package-api.md) | 去标识导出接口已存在；完整 ZIP 当前由前端演示生成 |

统一要求：写请求携带 `X-HospitalAI-Role`；生产实现增加 `Idempotency-Key`；错误返回可定位字段、业务状态和关联 ID；审核人由认证上下文取得，不能由请求体伪造。
