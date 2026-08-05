# HospitalAI Backend(core-api)规范

> core-api 是 Spring Boot 模块化单体,作为业务事实、正式状态、权限、审计和硬规则的唯一权威服务。

---

## Pre-Development Checklist

动手改 core-api 代码前,必须完成:

1. **先读共享指南**:`../../guides/index.md`(尤其医学安全、科研合规、项目边界)。
2. **明确分层落点**:改的是 controller/service/repository/model 哪一层?是否放对了位置?
3. **医疗规则?**:若涉及剂量、过敏、禁忌、相互作用——必须走确定性规则,且要加规则病例测试。
4. **契约变更?**:是否改变与前端或 ai-service 的接口?先改契约再改实现。
5. **数据模型?**:是否新增字段?是否保留版本、来源、审核状态?
6. **权限**:新端点是否需要角色校验?默认不允许越权。

---

## 分层结构

包结构:`com.hospitalai.core.{controller, service, repository, model, config}`

| 层 | 职责 | 禁止 |
|----|------|------|
| Controller | 校验、角色检查、转发 | 不得写业务规则 |
| Service | 持 repository 编排业务 | 不得直接暴露 SQL |
| Repository | `JdbcTemplate` 手写 SQL + 手动 RowMapper | **无 JPA/MyBatis、无 Entity 注解** |
| model | 嵌套 Java record,集中在 `Dto.java` | 不用可变 POJO |

**关键**:Repository 直接手写 SQL + RowMapper,不要引入 JPA/MyBatis。

---

## 医学规则分层(核心约束)

- 规则元数据存 `clinical_rule` 表:`rule_id + version` 复合主键、`status/severity/basis/deterministic_handler/published_at`。
- 仅 `status LIKE 'published%'` 的规则可加载。
- 硬规则在 `evaluateRules()` 按固定 ruleId 硬编码:
  - `HR-ALG-001` 过敏 = **blocking 阻断**
  - `HR-ADR-001` 严重 ADR = 强提醒
  - `HR-XDEPT-001` 跨科室冲突
  - `HR-MISS-001` 检验缺失
- **阻断不可绕过**:`decide()` 中阻断返回 `blocked_by_hard_rule`,禁止任何路径绕过。
- 每次规则执行写 `rule_execution` 表(审计)。

### 剂量纪律

- 剂量只从 `dose_rule` published 规则取。
- `rule_not_found` 时**明示"不得由 AI 或系统补写剂量"**。
- 剂量计算必须走确定性算法,禁止模型生成剂量数字。

---

## 数据模型约定

- 全部用嵌套 Java record,集中在 `Dto.java`。
- ID 模式 = 业务前缀 + UUID:`REV-` / `DWT-` / `ADR-` / `RAT-`。
- 推荐 ID = `REC-{encounterId}-v{dataVersion}`。
- 版本 + 生命周期:规则/证据均带 `version`、`effectiveDate`、`status` 流转(`draft→review_pending→published→withdrawn`)和 `published_at`。
- 知识发布需 **2 个不同 reviewer_role approve**。
- 数据版本冲突使旧推荐过期。

---

## 权限与安全

- 当前开发环境角色走请求头 `X-HospitalAI-Role` + `requireAny()` 白名单。
- 缺省取 `hospitalai.dev-role`(默认 `doctor`)。
- 越权抛 `SecurityException`,统一返回 403;非法参数返回 400。
- **新端点必须做角色检查**,默认不允许越权。

---

## 异步任务

- **不用 MQ / 定时器**,用任务表 + 手动轮询:`research_analysis_task`(status `queued/processing/retry_scheduled/dead_letter/completed`、`attempt_count`、`next_attempt_at`、`last_error`)。
- 领取模式:`SELECT LIMIT 1` 再 UPDATE 为 processing 原子领取。
- 失败 `attempt+1`,≥3 次进 `dead_letter`,退避 `60s × attempt`。
- 同模式用于 HIS 处方回写任务。

---

## 数据库

- Flyway 命名:`V{n}__snake_case_描述.sql`。
- 幂等写法:`CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS` + DO 块查 `pg_constraint`。
- 列名 snake_case,Java 手写映射。
- 生产 PostgreSQL;测试 profile `h2-demo`(关 Flyway,用 `schema-h2.sql` / `data-h2.sql`,H2 MODE=PostgreSQL)。

---

## 与 ai-service 契约

- 同步 HTTP JSON(Java 11 HttpClient),基址 `${ai.service-base-url}`。
- 端点:`POST /v1/evidence/retrieve`、`POST /v1/research/statistics/run`。
- 请求手写 record,响应 Map/TypeReference 解析,**无 OpenAPI 生成客户端**。
- **失败降级或标记任务失败,禁止编造数据**。

---

## 测试要求

- **规则病例测试**:mock repository 验证规则逻辑(二次入院继承过敏阻断、缺检验标记)。
- **集成测试**:`@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("h2-demo")` 跑真实 API 全链路。
- 种子含 `clinical_rule_case` 表存病例(`input_ref` = 临床场景)。
- 断言用 Hamcrest jsonPath / AssertJ。

---

## 评审清单

- [ ] 分层是否正确(controller/service/repository/model)?
- [ ] 医疗规则是否走确定性路径?有无病例测试?
- [ ] 剂量是否只从 published dose_rule 取?
- [ ] 新端点有无角色校验?
- [ ] 数据模型保留版本/来源/审核状态?
- [ ] 与 ai-service 契约变更是否已对齐?
- [ ] 任务失败是否标记而非假装成功?
