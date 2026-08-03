# HospitalAI 商业级开发任务清单

文档版本：V0.4  
更新时间：2026-08-03

## 当前任务状态

- 已完成：MVP 纵向切片、三栏工作台、最小规则、演示证据、医生审核、模拟草稿、基础 E2E。
- 已完成：商业级需求补齐、真实数据链路开发基线、Git 同步。
- 进行中：M1 真实数据链路基座。
- 待启动：规则/证据治理、药师复核、长期追踪、科研资产、上线级安全与运维门槛。

## 里程碑

### M1 真实数据链路基座

1. 已完成：建立 `.gitignore`、`.gitattributes`、迁移目录和基础验证命令。
2. 已完成：引入 Flyway，PostgreSQL 默认路径使用 `db/migration`，H2 演示 profile 保留 SQL 初始化。
3. 已完成：建立 HIS adapter OpenAPI、Core API 导入契约和 HIS snapshot JSON Schema。
4. 已完成：实现 `HisSnapshotImportService`，将版本化快照经 inbound event 写入正式表。
5. 已完成：移除 UI 固定病例列表硬依赖，改为患者工作列表 API。
6. 待完成：PostgreSQL/pgvector 集成测试通过，需要可用 Docker Desktop Linux engine 或数据库凭据。
7. 待完成：CI 基线、OpenAPI/JSON Schema 自动校验、真实医院导出样例字段映射模板。

### M2 规则与证据治理

1. 规则版本表、规则病例表、执行记录表。
2. 规则审核发布流程。
3. 剂量计算器接口和首批演示规则。
4. 文件与 EvidenceDocument/DocumentBlock/EvidenceChunk。
5. 证据审核发布和撤回。
6. RAG 检索从数据库读取证据片段。

### M3 推荐审核闭环

1. 推荐状态机和过期机制。
2. 医生修改差异结构化。
3. 药师复核队列。
4. HIS 草稿回写 adapter、幂等和回调。
5. 强提醒处理理由和跨科室协同任务。
6. 全链路审计。

### M4 患者追踪与科研资产

1. 用药事件链。
2. 反馈、不良反应、出院结局。
3. 研究队列和变量字典。
4. 数据质量与冻结版本。
5. 固定 Python 统计运行。
6. 报告草稿、审核、知识提交。

### M5 上线级质量门槛

1. 权限票据、RBAC/ABAC、超级管理员约束。
2. OpenTelemetry。
3. 备份恢复脚本和演练报告。
4. 安全扫描和依赖审计。
5. 性能压测。
6. 需求追踪矩阵和验收结论。
