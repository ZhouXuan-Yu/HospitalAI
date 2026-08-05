# State Management

> How state is managed in this project.

---

## State Solution

- **Pinia**(已冻结)。仅 2 个全局 store:

| Store | 职责 | 数据来源 |
|-------|------|----------|
| `workbench` | 服务端数据、医生决策 | Core API(真实)或 flowSimulation(降级) |
| `flowSimulation` | 前端模拟流程 | localStorage + 场景 JSON |

- 页面局部状态留在组件内,不进全局 store。

---

## State Categories

| 类别 | 处理方式 |
|------|----------|
| 本地状态 | 组件内 `ref` / `computed` |
| 全局状态 | Pinia store(`workbench` / `flowSimulation`) |
| 服务端状态 | `workbench` store,裸 fetch 到 Core API |
| URL 状态 | Vue Router;页面懒加载路由 |
| 持久化 | `flowSimulation` → localStorage(`hospitalai.frontend-flow.v1`) |

---

## Persistence Pattern

```ts
// flowSimulation.ts
const STORAGE_KEY = 'hospitalai.frontend-flow.v1'

// 写入:每次变更后手动 persist()
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// 读取:用 Ajv 校验,失败则清除
const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY))
if (ajv(parsed)) { /* use */ } else { localStorage.removeItem(STORAGE_KEY) }
```

---

## Cross-Page Sync

- `flowSimulation` 跨页面共享(AppShell / DoctorWorkbench / ResearchWorkbench)。
- `revision` 计数器当变更通知:`watch(() => flow.revision, reload)`。
- 升级为全局 store 的时机:2 个以上页面共享同一状态。

---

## Server State

- `workbench` store 从 Core API 拉数据。
- 降级链:`VITE_UI_PREVIEW==='true'` → flowSimulation 场景 → previewData.ts 内置数据。
- 错误 catch 后落 preview,消息塞进 `store.error` 用 el-alert 展示。

---

## Common Mistakes

- 把页面局部状态塞进全局 store → 状态爆炸。
- 忘记 `persist()` → localStorage 不更新。
- 读取 localStorage 不校验 → 旧 schema 崩溃。
- 不用 `revision` 做跨页刷新 → 数据过期。
