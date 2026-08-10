# 前端重塑阶段验收记录

## 已执行

| 检查项 | 结果 | 证据 |
|---|---:|---|
| Vue 类型检查与生产构建 | 通过 | `apps/web`: `npm run build` |
| Pinia/Core API/JSON 流单测 | 11/11 通过 | `apps/web`: `npm test` |
| 既有 Playwright 流程 | 10/14 通过 | `apps/web`: `npm run e2e` |
| 既有 Playwright 失败 | 4 | 2 个 API 文档旧编码断言；2 个科研知识审核旧流程断言，涉及现有脏改动 `KnowledgeReviews.vue`，需独立复核 |
| 新增药师模块路由 | 已实现 | `/pharmacy/retrospective`、`/pharmacy/records`、`/pharmacy/education` |
| 接口契约 | 已补充 | `docs/10_FRONTEND_BACKEND_API_CONTRACT.md` |
| 需求追踪 | 已补充 | `docs/11_FRONTEND_REDESIGN_TRACEABILITY.md` |

## 当前阻塞与整改边界

1. 本轮没有把 `KnowledgeReviews.vue` 的用户未提交改动覆盖掉，因此科研知识审核的 2 个旧 E2E 失败不能直接归因于本轮页面壳改造；下一轮应先确认该文件的目标行为，再补回稳定断言。
2. 专用药历和用药教育的生产 API 仍需 Core API 按接口契约实现；前端已提供验证态流程，但不得在生产模式用内置场景冒充真实成功。
3. 由于当前工作区已有独立运行服务占用旧端口，本轮构建和单测已实际执行；新增路由需要在干净的本地服务进程上重新执行两视口截图和 E2E。

## 验收结论

前端重塑首轮可以进入后端接口联调，但尚未达到“全部 E2E 绿灯、药历/教育生产 API 完整、可上线”的最终验收门槛。最终上线门槛为：修复上述 4 个 E2E 失败、完成专用接口、完成安全扫描/性能压测/灾备演练并回填本报告。
