# Implement: 处方辅助决策页面主次层级与 DeepSeek 流程优化

## Steps

1. 更新 `DoctorWorkbench.vue`：
   - 三栏容器增加左右收起状态。
   - 左侧低频患者事实改为折叠详情。
   - 中央增加推荐结论主卡、推荐刷新/模拟患者入口、候选快速选择。
   - 将推理阶段和候选矩阵收纳为可展开详情。
   - 每个推理节点展开后展示关键输入、处理逻辑和输出结果。
   - 横向对比下方新增推荐药品组合说明，并按单药折叠展示核对要点。
2. 更新 `apps/web/src/theme.css`：
   - 默认三栏比例改为 20/60/20。
   - 增加侧栏收起、核心推荐卡、候选快速选择、折叠详情和加载动画样式。
   - 调整响应式行为，较窄视口维持中央优先。
3. 更新 DeepSeek 流程接入：
   - `services/ai-service/app/main.py` 通过 `DEEPSEEK_API_KEY`、`DEEPSEEK_API_BASE`、`DEEPSEEK_MODEL` 后端环境变量启用 DeepSeek。
   - AI 服务只生成简要溯源说明和 trace summary，不生成处方、剂量或疗程决定。
   - Core API 根据 AI 服务 pipeline 标记 DeepSeek 溯源阶段。
4. 验证：
   - `npm run build`
   - `npm test`
   - `PYTHONPATH=.; pytest tests/test_evidence.py` in `services/ai-service`
   - 如时间允许，运行 Playwright 工作台用例。

## Rollback

回退 `DoctorWorkbench.vue`、`theme.css`、`workbench.spec.ts`、AI 服务 DeepSeek 接入、Core API pipeline 文案和 `.env.example` 的本任务改动即可；不影响已有 pharmacist/knowledge dirty changes。
