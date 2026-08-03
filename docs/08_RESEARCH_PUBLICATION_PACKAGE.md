# 科研数据包与医学结论报告规范

文档版本：V1.0
更新时间：2026-08-04

## 1. 交付目标

科研工作台必须同时交付一份可复现数据压缩包和一份专业医学数据结论报告。两者绑定同一冻结数据集、统计运行和报告版本，不允许只输出无数据支撑的结论文章，也不允许只导出无法解释的数据表。

前端验证模式生成真实 ZIP 和 DOCX 文件，但当前样例为合成数据，只验证治理与发表准备流程，不能用于论文投稿、临床证据或个体化用药决策。

## 2. ZIP 数据包结构

```text
README.md
manifest.json
metadata/protocol.json
metadata/analysis-plan.json
data/analysis-dataset.csv
data/variable-dictionary.csv
data/inclusion-log.csv
quality/quality-issues.csv
analysis/result.json
analysis/reproducibility.md
audit/flow-audit.json
report/{reportVersion}.docx
```

`manifest.json` 使用 `hospitalai.research-package.v1`，记录数据集版本、输入哈希、统计运行、输出哈希、报告版本以及每个文件的 SHA-256 和字节数。分析数据不包含患者主键、就诊主键或直接身份信息，只保留研究记录标识；正式环境还必须由后端执行脱敏策略、权限校验和下载审计。

## 3. 医学报告结构

DOCX 报告包含：

1. 标题页、机构、主要研究者、统计负责人和数据边界声明。
2. 结构式摘要。
3. 研究背景、问题、设计、观察时间窗、纳排标准。
4. 伦理、注册、主要终点、次要终点、暴露定义、预设混杂因素。
5. 数据集版本、质量控制、缺失与排除说明。
6. 不同用药暴露方案的描述性结果表。
7. 年龄和性别分层的未经调整结果表。
8. 讨论、偏倚、局限、结论和临床解释边界。
9. 数据可用性、软件版本、输入输出哈希和复现说明。
10. 投稿前强制审核清单。

## 4. “什么药更适合什么患者”的结论边界

不同患者分层下的药物结局差异只能先作为观察性信号。系统不得仅依据未经调整的改善比例自动生成“药物 A 更适合人群 B”的结论。形成可发表或可用于临床知识的适用性结论前，至少需要：

- 预注册研究问题、主要终点、暴露定义和统计分析计划。
- 足够样本量及事先完成的样本量估算。
- 疾病严重程度、年龄、肾功能、合并症和既往用药等混杂控制。
- 倾向评分、分层/多变量模型或其他经统计负责人确认的方法。
- 敏感性分析、多重比较控制、缺失数据处理和模型诊断。
- 外部验证或时间外验证。
- 伦理、临床、药学、统计和科研管理多角色审核。

当前固定分析仅提供描述性分布和假设生成，不执行因果推断。

## 5. JSON 输入要求

场景包 `research.publicationProfile` 必须提供机构、研究负责人、统计负责人、伦理状态、注册标识、目标期刊、主要/次要终点、暴露定义、混杂因素、统计软件和报告规范。缺少这些字段的 JSON 在进入科研流程前由 Schema 拒绝。

## 6. 实现位置

- 科研制品生成：`apps/web/src/services/researchArtifacts.ts`
- 科研状态与分层统计：`apps/web/src/stores/flowSimulation.ts`
- 科研工作台：`apps/web/src/views/ResearchWorkbench.vue`
- 知识审核：`apps/web/src/views/KnowledgeReviews.vue`
- 场景契约：`apps/web/src/contracts/flowScenario.schema.json`

生产接入时，浏览器生成器仅保留为离线预览；正式 ZIP、DOCX、哈希、签名、留存和下载授权应由后端可靠任务生成并写入不可变制品库。
