# HospitalAI 前端信息架构与接口追踪

文档版本：V1.0  
更新时间：2026-08-03

## 1. 设计目标

前端第一屏是面向院内重复工作的业务工作台，不是营销页或统计大屏。设计以患者安全、医生决策效率、专业审核责任和全链路可追溯为优先级；任何预览数据都明确标识为非生产数据，不把前端展示状态伪装成真实接口结果。

## 2. 角色与页面

| 角色域 | 页面 | 核心用户价值 | 关键交互 | 主要接口契约 |
|---|---|---|---|---|
| 医生 | 患者工作列表 | 按风险和待办快速进入当前就诊 | 搜索、风险筛选、进入决策 | `GET /api/worklist` |
| 医生 | 处方辅助决策 | 在同屏完成事实核对、硬规则、证据比较和医生审核 | 候选选择、采纳、修改、驳回、安全抽屉 | `GET /api/workbench/{encounterId}`、`POST /api/recommendations/{recommendationId}/decision` |
| 医生 | 患者用药全景 | 区分当前就诊和跨就诊安全摘要 | 事实分组、趋势查看、来源定位 | 患者时间线、反馈、结局接口组 |
| 医生 | 长期用药追踪 | 关联多次就诊、用药暴露、ADR 与结局 | 分段筛选、多轨时间线 | `GET/POST /api/patients/{patientId}/timeline` |
| 药师 | 风险复核队列 | 集中处理强提醒、严重 ADR 和跨科室冲突 | 队列筛选、事实对照、沟通、解决 | 药师复核、ADR、协同任务接口组 |
| 治理 | 临床规则管理 | 让确定性规则经过版本、病例和双角色审核后发布 | 新建草稿、提交复核、发布、撤回、病例查看 | `/api/rules` 生命周期、`/api/dose/calculate` |
| 治理 | 证据资料中心 | 管控资料上传、解析、审核、发布和原文定位 | 上传、解析块检查、发布、撤回 | `/api/evidence/documents`、`/api/evidence/chunks` |
| 科研 | 科研工作台 | 固定队列、变量、质量、统计代码和报告版本 | 阶段推进、质量检查、冻结、统计任务 | `/api/research/**` |
| 知识 | 知识审核中心 | 防止未审核科研结论直接进入正式知识库 | 数据/报告/证据对照、双角色审核、退回 | `/api/knowledge/submissions/**` |
| 管理 | 接口与同步 | 管理医院连接器、字段映射、游标和失败重试 | 事件查看、版本比较、连接策略 | `/api/integration/his/snapshots/import`、`/v1/his/**` |
| 管理 | 审计日志 | 验证责任链和状态变化，支持合规导出 | 过滤、详情、前后差异、哈希链 | 正式审计查询接口待后端阶段补契约 |
| 开发 | API 接口文档 | 以唯一契约查看全部服务边界和页面归属 | 服务/方法筛选、参数响应查看 | 实时解析三份 OpenAPI YAML，共 61 个操作 |

## 3. 导航与安全边界

- 顶层导航按医生、药师、规则与证据、科研与知识、系统管理五个工作域分组。
- 超级管理员仅提供开发环境全视图，切换角色只改变导航可见性，不改变医疗硬阻断。
- 医生决策页在 1920 宽度显示患者、候选、风险证据三栏；1366 宽度将右栏变为安全审查抽屉，患者事实与候选矩阵保持同屏。
- AI 服务不可用时仍展示患者事实和确定性规则；未知检验保持“缺失”，不得显示为正常。

## 4. 数据模式

- 默认集成模式：`VITE_UI_PREVIEW=false`，页面调用 Core API，正式状态由后端和数据库决定。
- 前端验收模式：`VITE_UI_PREVIEW=true`，只读取 `src/data/previewData.ts` 中符合接口类型的导入验证数据，不向后端发请求。
- 页面固定显示“界面预览模式 / 未连接医院生产数据”，审核结果使用 `PREVIEW-*` 标识，不能与生产记录混淆。

## 5. 实现位置

- 应用壳与角色导航：`apps/web/src/layouts/AppShell.vue`
- 路由：`apps/web/src/router/index.ts`
- 医疗主题与产品基础组件：`apps/web/src/theme.css`、`apps/web/src/product.css`
- 页面：`apps/web/src/views/`
- 契约型预览数据：`apps/web/src/data/previewData.ts`
- 接口服务与状态：`apps/web/src/services/coreApi.ts`、`apps/web/src/stores/workbench.ts`
- OpenAPI：`contracts/openapi/core-api.v1.yaml`、`ai-service.v1.yaml`、`his-adapter.v1.yaml`

## 6. 前端验收命令

```powershell
cd D:\WorkProject\HospitalAI\apps\web
npm run build
npm test
$env:VITE_UI_PREVIEW='true'; npm run dev -- --host 127.0.0.1 --port 5175
$env:E2E_BASE_URL='http://127.0.0.1:5175'; npm run e2e
```
