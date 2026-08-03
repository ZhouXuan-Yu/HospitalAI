# HospitalAI 对抗性审查与上线验收计划

文档版本：V0.4  
更新时间：2026-08-03

## 1. 验收门槛

上线前必须同时满足：

- 需求追踪矩阵覆盖率 100%。
- P0/P1 缺陷全部关闭。
- 过敏硬阻断病例通过率 100%。
- 未审核证据参与正式推荐数量为 0。
- 审计删除和硬规则绕过测试全部失败。
- PostgreSQL/pgvector 集成链路通过。
- 性能、备份恢复、安全扫描有报告和结论。

## 2. 测试分层

| 层级 | 工具 | 内容 |
|---|---|---|
| Java 单元 | Maven/JUnit | 规则、剂量、权限、幂等、状态机 |
| Python 单元 | pytest | 解析、检索、重排序、降级 |
| 契约测试 | OpenAPI/JSON Schema | Core/AI/HIS adapter 请求响应 |
| 集成测试 | Testcontainers/PostgreSQL | 数据导入、落库、回读、事务 |
| 前端测试 | Vitest | Store、组件状态、风险展示 |
| E2E | Playwright | 5 条核心医疗流程、1366/1920 视口 |
| 安全测试 | OWASP ZAP/依赖扫描 | 越权、注入、XSS、敏感信息 |
| 性能压测 | k6/JMeter | 患者上下文、规则、推荐、回写 |
| 容灾演练 | 备份恢复脚本 | DB + 文件同批次恢复 |

## 3. 对抗性审查清单

### 3.1 需求覆盖率审查

- 每个需求编号映射到代码模块、API、数据表、测试用例。
- 无实现路径的需求不能进入“完成”状态。
- UI 按钮必须对应真实 API 和状态变更。

### 3.2 医疗安全审查

- AI 是否生成剂量、禁忌、过敏确认或正式规则。
- 已确认过敏是否在所有后续就诊继承。
- 超级管理员是否能绕过阻断。
- 证据不足时是否补写理由。

### 3.3 数据一致性审查

- PatientProfile 是否被重复创建。
- 跨科室当前用药是否进入安全摘要。
- 推荐版本是否记录患者、规则、证据和模型版本。
- 推荐过期是否阻止草稿回写。

### 3.4 安全合规审查

- URL、日志、Prompt 是否包含真实患者身份信息。
- 审计日志是否可被删除或篡改。
- 角色、科室和患者上下文是否从服务端票据派生。
- 导出是否执行脱敏和权限校验。

## 4. 报告输出

最终交付必须包含：

- `docs/validation/requirements-traceability-matrix.md`
- `docs/validation/adversarial-review-report.md`
- `docs/validation/test-report.md`
- `docs/validation/performance-report.md`
- `docs/validation/security-scan-report.md`
- `docs/validation/disaster-recovery-report.md`
- `docs/validation/go-live-acceptance.md`
