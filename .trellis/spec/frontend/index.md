# HospitalAI Frontend(web)规范

> Vue 3 医生工作台。用真实约定指导开发,不是通用最佳实践。

---

## Pre-Development Checklist

动手改前端代码前,必须完成:

1. **先读共享指南**:`../../guides/index.md`(医学安全、科研合规、项目边界)。
2. **读任务 artifacts**:`prd.md` / `design.md` / `implement.md`。
3. **理解页面结构**:是 12 个业务页面中的哪一个?走 `views/` 路由懒加载。
4. **确定数据来源**:真实 Core API(`services/coreApi.ts`)还是模拟(`VITE_UI_PREVIEW` / mockApi)?界面上是否清楚标识边界?
5. **降级链**:错误处理是否走 store 错误状态 + el-alert?

---

## 技术栈(已冻结)

- Vue 3 + TypeScript + Vite。
- Pinia、Vue Router。
- Element Plus,自定义安静、专业、信息密度适中的医疗主题。
- 图标 `lucide-vue-next`。
- 单元测试 Vitest;端到端测试 Playwright。
- 构建 = `vue-tsc --noEmit && vite build`。

---

## 目录结构

```text
apps/web/src/
├── views/           # 12 个页面,一个页面一个文件,路由懒加载
├── stores/          # 仅 2 个 Pinia store:workbench、flowSimulation
├── services/        # coreApi(真实API) / mockApi(页面级mock) / researchArtifacts(docx/zip)
├── types/           # flowScenario.ts(复引 coreApi 类型)
├── contracts/       # JSON Schema(Ajv 运行时校验)
├── data/            # JSON fixtures + previewData.ts 降级数据
├── layouts/         # AppShell.vue 单壳
└── components/      # 共享组件(当前仅 ScenarioImportDialog.vue)
```

---

## 组件模式

- 全部 `<script setup lang="ts">` 组合式 API。
- **无 props/emits**——组件间靠 store 通信;模板直接 `store.payload.xxx`,不用 mapState。
- 页面固定结构:template → script setup → scoped style。
- 大量 computed 派生 + 小映射函数(如 riskLabel / riskIcon)。
- 跨页面同步靠 `watch(() => flow.revision)`。

---

## 状态管理

- 两个 store 分工:
  - `workbench`:服务端数据、医生决策。
  - `flowSimulation`:前端模拟流程,workbench 降级时依赖它。
- localStorage:key `hospitalai.frontend-flow.v1`,每次变更后手动 `persist()`。
- 读取时用 **Ajv 校验**,失败则清除。
- `revision` 计数器当变更通知机制,跨页面共享。
- 每测试 `setActivePinia(createPinia())`。

---

## 类型安全

- 类型定义在 service 或 types 文件导出;`types/flowScenario.ts` 复引 coreApi 类型。
- **JSON Schema + Ajv2020 运行时校验**:`ajv.compile<FlowScenario>(scenarioSchema)`。
- schema 用 `"additionalProperties": false` + required。
- **基本不用 `any`**,用 `Record<string, unknown>`;降级路径才用 `as` 断言。

---

## 数据流

- `coreApi.ts`:裸 fetch + `if (!response.ok) throw new Error('中文错误')`,无 axios/拦截器。
- 角色走 `X-HospitalAI-Role` header。
- vite proxy `/api` → localhost:8080,可用 `VITE_CORE_API_BASE` 覆盖。
- **降级链**:`VITE_UI_PREVIEW==='true'` → flowSimulation 场景 → previewData.ts 内置数据。
- 错误 catch 后落 preview 并把消息塞进 `store.error` 用 el-alert 展示。

---

## 命名约定

- 文件:camelCase 模块 / `PascalCase.vue` 组件。
- store:`useXxxStore` + `defineStore('xxx')`。
- API 函数:动词前缀 `fetchXxx / submitXxx / resolveXxx / reviewXxx`。
- 常量:`UPPER_SNAKE`(STORAGE_KEY、DEFAULT_SCENARIO_URL)。
- 状态枚举:全大写(`CREATED` / `HIS_DRAFT_CREATED`)。
- 中文 UI 文案内联;schema 版本号 `hospitalai.frontend-flow.v1`。

---

## 质量约定

- 页面共性:header topbar + el-alert 错误 + el-skeleton 加载 + `data-testid` 供 e2e。
- 表单禁用态用 computed,不用校验库。
- Playwright 在 `e2e/`,检查 1366x768 与 1920x1080 两视口。
- 测试用 jsdom + `vi.stubGlobal('fetch')` mock。

---

## 评审清单

- [ ] 页面结构符合"header topbar + el-alert + el-skeleton + data-testid"?
- [ ] 数据来源边界是否清楚(VITE_UI_PREVIEW 是否为 true)?
- [ ] 是否误用 `any`?是否用 `Record<string, unknown>`?
- [ ] JSON Schema 是否用 Ajv 校验?
- [ ] 跨页面状态是否走 store + revision?
- [ ] 1366 与 1920 两视口是否无溢出?
- [ ] 医疗边界标识("演示证据/未发布"等)是否保留?
