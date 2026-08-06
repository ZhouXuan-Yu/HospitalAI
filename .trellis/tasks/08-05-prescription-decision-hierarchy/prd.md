# 处方辅助决策页面主次层级与 DeepSeek 流程优化

## Goal

优化处方辅助决策页面的信息层级、三栏比例、折叠交互和推荐生成流程表达，让中间“处理/推荐”区域成为唯一第一视觉焦点，左右侧仅承担输入摘要和参考记录。

## Requirements

- 中央推荐区域默认占约 60% 宽度，左右侧各约 20%，并支持左右侧栏收起为窄栏。
- 中央默认展示推荐结论、主要风险状态、监测要点和医生处理按钮。
- 患者主诉/诊断摘要常驻；检验、用药、过敏史、病史等细节默认折叠或摘要化。
- 推理依据默认折叠，只显示结论；需要时展开查看 DeepSeek/Core 决策阶段、证据和候选矩阵。
- 每个流程节点展开后只展示关键输入、处理逻辑和输出结果，回答“结果如何得出”，避免大段技术细节。
- 横向候选对比下方新增当前推荐药品组合说明，按药品折叠展示作用、适应症、用法用量、相互作用、不良反应、注意事项和出处。
- DeepSeek API 只在后端 AI 服务通过环境变量启用，生成简要溯源说明；不得在前端暴露密钥，不得替代硬规则或医生最终决策。
- 保留真实流程：当前患者加载触发 Core API/DeepSeek 推荐链路；预览或不可用时使用模拟患者数据。
- 提供“生成/刷新推荐”和“模拟患者”入口，能从数据接入开始重新触发页面推荐流程。
- 清理杂乱视觉：弱化分隔线，统一间距，减少冗余文本和无关按钮。
- 硬阻断风险仍不可绕过，医生处理按钮禁用逻辑保持不变。

## Acceptance Criteria

- [x] `DoctorWorkbench.vue` 保留三栏结构，中央区显著优先于左右辅助区。
- [x] 左右侧栏可收起/展开，收起时保留标题或图标入口。
- [x] 患者细节和推理依据使用折叠面板收纳，核心推荐结论默认可见。
- [x] 推理流程节点展开后包含关键输入、处理逻辑、输出结果。
- [x] 候选方案横向对比下方提供默认折叠的药品组合说明。
- [x] DeepSeek 集成使用服务端环境变量并保留降级路径。
- [x] 推荐刷新和模拟患者入口能触发现有 workbench 加载流程。
- [x] 页面构建与前端测试通过。

## Validation

- `npm run build` passed.
- `npm test` passed: 3 files / 11 tests.
- `PYTHONPATH=.; pytest tests/test_evidence.py` passed in `services/ai-service`: 6 tests.
- `npx playwright test e2e/workbench.spec.ts --project=chromium-1366 -g "doctor can view normal patient|doctor can expand concise provenance"` passed.
- `npx playwright test e2e/workbench.spec.ts --project=chromium-1366 -g "doctor can view normal patient|confirmed allergy|missing labs|role switch|all role workspaces"` passed.
- `npx playwright test e2e/workbench.spec.ts --project=chromium-1920 -g "doctor can view normal patient"` passed.
- Full `chromium-1366` workbench suite has one pre-existing unrelated failure after navigating to `KnowledgeReviews`: `KS-RPT-CAP-FLOW-v1` is not visible under the current dirty knowledge-review integration state.
- Java/Core API compile was not run because this environment has no `java` or `mvn` command on PATH.
