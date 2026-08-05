# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

- 医疗 UI 注重信息密度与安静、专业、可审计。
- 每个页面必须清楚标识数据边界(演示证据/未发布)与生产状态。

---

## Required Patterns

- 页面固定结构:header topbar + el-alert 错误 + el-skeleton 加载 + `data-testid`。
- 构建 = `vue-tsc --noEmit && vite build`(类型检查 + 构建)。
- 角色化导航 + 待办驱动首页,不使用全用户共用的功能总菜单和统计大屏。
- 3 个风险等级(阻断/强提醒/一般提示)清楚分级展示。

---

## Forbidden Patterns

- 用 `any` 绕过类型检查。
- 页面堆满大卡片、卡片套卡片、装饰性视觉。
- 文字在 1366 与 1920 视口下重叠或溢出。
- 隐藏医疗安全边界标识(演示证据/未发布)。

---

## Testing Requirements

- **Vitest**:`tests/*.test.ts`(jsdom)。
  - 每测试 `setActivePinia(createPinia())` + `vi.stubGlobal('fetch')` mock。
- **Playwright**:`e2e/`,检查 1366x768 与 1920x1080 两视口。
- 至少覆盖:医生采纳生成草稿、二次入院过敏继承硬阻断、跨科室冲突、AI 服务降级、关键检验缺失标记。

---

## Code Review Checklist

- [ ] `vue-tsc --noEmit` 是否通过?
- [ ] 是否误用 `any`?
- [ ] 数据边界是否清楚标识?
- [ ] 1366 / 1920 两视口是否无溢出?
- [ ] `data-testid` 是否齐备?
- [ ] 医疗安全标识是否保留?
