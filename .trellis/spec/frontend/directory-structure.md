# Directory Structure

> How frontend code is organized in this project.

---

## Directory Layout

```text
apps/web/src/
├── views/           # 12 个业务页面,一个页面一个文件,路由懒加载
│   ├── PatientWorklist.vue
│   ├── DoctorWorkbench.vue
│   ├── PatientOverview.vue
│   ├── MedicationTimeline.vue
│   ├── PharmacistReviews.vue
│   ├── RuleGovernance.vue
│   ├── EvidenceCenter.vue
│   ├── ResearchWorkbench.vue
│   ├── KnowledgeReviews.vue
│   ├── IntegrationConsole.vue
│   ├── AuditLog.vue
│   └── ApiDocs.vue
├── stores/          # 仅 2 个 Pinia store:workbench、flowSimulation
├── services/        # coreApi(真实API) / mockApi(页面级mock) / researchArtifacts(docx/zip)
├── types/           # flowScenario.ts(复引 coreApi 类型)
├── contracts/       # JSON Schema(Ajv 运行时校验)
├── data/            # JSON fixtures + previewData.ts 降级数据
├── layouts/         # AppShell.vue 单壳
└── components/      # 共享组件(当前仅 ScenarioImportDialog.vue)
```

---

## Module Organization

- 页面按角色/功能组织在 `views/`,一个页面一个文件。
- store 只放全局共享状态;页面局部状态留在组件内。
- 共享组件放 `components/`;单页私有组件内联在页面文件。

---

## Naming Conventions

- 文件:camelCase 模块 / `PascalCase.vue` 组件。
- store:`useXxxStore` + `defineStore('xxx')`。
- API 函数:动词前缀 `fetchXxx / submitXxx / resolveXxx / reviewXxx`。
- 常量:`UPPER_SNAKE`(STORAGE_KEY、DEFAULT_SCENARIO_URL)。
- 状态枚举:全大写(`CREATED` / `HIS_DRAFT_CREATED`)。

---

## Examples

- 三栏医生工作台:参考 `views/DoctorWorkbench.vue`(患者/候选/风险证据三栏)。
- 跨页共享状态:参考 `stores/flowSimulation.ts`(localStorage + Ajv + revision)。
