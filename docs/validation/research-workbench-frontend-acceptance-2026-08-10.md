# 科研工作台前端纵向链路验收记录

## 结论

前端已跑通“选题与方案 -> 导入 2,000 例合成 JSON -> 纳排与质控 -> 数据集冻结 -> 固定统计展示 -> 报告草稿 -> 三级审核 -> ZIP/DOCX 导出”。本轮是前端演示与接口预留交付，不等同于服务端生产科研平台。

## 数据证据

- 导入契约：`hospitalai.research-dataset.v1`。
- 合成候选记录：2,000 条。
- 按年龄、诊断、暴露和随访标准纳入：1,960 条。
- 数据集：`DS-PROJECT-NVAF-DOAC-2026-01-v1`。
- 合成数据由 `fixtures/research/generate_nvaf_doac_dataset.py` 固定随机种子生成，不写死在 Vue 组件。

## 实际验证

```text
npm run build
结果：通过，vue-tsc 与 Vite 均成功。

npm test
结果：3 个测试文件、12 个测试全部通过。

E2E_BASE_URL=http://127.0.0.1:5180 npx playwright test e2e/workbench.spec.ts --grep "imported research JSON"
结果：1366x768 与 1920x1080 共 2/2 通过。
```

Playwright 实际完成内置数据导入、协议保存、纳排、变量确认、3 项质量问题处理、冻结、统计、报告生成、药师/统计师/医学负责人顺序审核、ZIP 与 DOCX 下载。

## 产物回读

- ZIP：`docs/validation/research-package-chromium-1366.zip`
- ZIP SHA-256：`2DA8D25353F3CA840A03336900A0A47BBBE4744A0F287FE224C07C547AED4D9F`
- DOCX：`docs/validation/medical-data-report-chromium-1366.docx`
- DOCX SHA-256：`7C4859819AEC21F195BF9BFDE35ECADD5236F4BFA477C7E3B43E7D19E70020E3`
- ZIP 共 18 个条目，已回读确认分析数据、变量字典、纳排、质量、分析结果、复现说明、审计、DOCX 和 manifest 存在。

## 视觉证据

- `docs/validation/ui-research-report-flow-chromium-1366.png`
- `docs/validation/ui-research-report-flow-chromium-1920.png`
- `docs/validation/ui-full-flow-chromium-1366.png`
- `docs/validation/ui-full-flow-chromium-1920.png`

两种视口均无页面级横向滚动。页面使用五阶段业务导航、可扫描表格、按需报告编辑和成果血缘，不展示模型营销信息。

## 已知边界

1. 统计效果量为合成数据的前端演示计算，固定 Python IPTW/Cox 生产流水线尚未在本轮接入页面。
2. JSON 由前端 Ajv 校验并保存在浏览器；服务端 Excel/JSON 上传、暂存、事务发布和数据库记录仍是后续后端任务。
3. ZIP/DOCX 当前由浏览器生成；生产环境仍需服务端签名、下载授权、不可变留存和敏感字段扫描。
4. 全量 Playwright 运行中科研专项 2/2 通过，另外 12 个旧处方/导航断言因既有 UI 重塑后选择器过期而失败；本轮未倒退现有页面以迁就旧断言，需单独更新旧 E2E。
