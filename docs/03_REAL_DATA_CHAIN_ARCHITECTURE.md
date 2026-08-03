# HospitalAI 真实数据链路架构

文档版本：V0.4  
更新时间：2026-08-03

## 1. 原则

功能实现不得依赖 Mock 或硬编码病例。没有医院接口时，也必须先实现真实适配器形态和导入链路，再用模拟文件导入验证。

## 2. 数据入口

### 2.1 在线连接器

- `HisSnapshotConnector`：读取患者当前快照。
- `HisEventConnector`：读取或接收增量事件。
- `PrescriptionDraftConnector`：创建处方草稿和查询最终状态。
- `SsoContextConnector`：校验医生、角色、患者、就诊上下文票据。

### 2.2 离线导入器

- `HisSnapshotImporter`：将 JSON/CSV/Excel 脱敏数据导入统一模型。
- `DrugCatalogImporter`：导入院内药品目录。
- `EvidenceImporter`：导入已审核证据资料。

模拟数据只允许作为这些导入器的输入。

## 3. 状态模型

| 对象 | 核心状态 |
|---|---|
| InboundEvent | received、validated、applied、ignored_duplicate、failed、dead_letter |
| EvidenceDocument | uploaded、parsed、metadata_pending、review_pending、published、replaced、withdrawn |
| ClinicalRule | draft、review_pending、published、retired |
| RecommendationDecision | generated、adopted、modified、rejected、expired |
| PrescriptionDraft | pending_write、written、write_failed、his_confirmed、his_cancelled |
| ResearchDataset | draft、quality_checked、frozen、exported |

## 4. 一致性要求

1. 每次推荐记录患者数据版本、规则版本、证据版本、模型/检索参数版本。
2. 提交处方草稿前重新读取过敏、当前用药、关键检验和就诊状态。
3. 数据版本变化后，原推荐标记为 expired。
4. HIS 回写使用幂等键，重复请求返回同一草稿状态。
5. 审计日志只追加，不允许物理删除。

## 5. 失败处理

- HIS 快照失败：页面显示可用旧数据、最后成功时间和不可更新范围，不伪造完整上下文。
- AI 服务失败：保留患者事实、硬规则和候选安全状态，解释阶段降级。
- 证据不足：候选保留，但理由显示证据不足，禁止补写医学解释。
- 处方草稿回写失败：保留医生决策和失败原因，不显示草稿成功。
- Worker 崩溃：任务租约过期后重试，超过阈值进入 dead_letter。

## 6. 数据库实施顺序

1. 建立 Flyway/Liquibase 迁移。
2. 拆分当前 `schema.sql` 为版本化迁移。
3. 增加接入、规则、证据、任务、权限、科研表。
4. 移除业务对 H2 profile 的验收依赖，只保留开发演示。
5. PostgreSQL/pgvector 集成测试成为默认验收。
