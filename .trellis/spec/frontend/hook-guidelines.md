# Hook / Composable Guidelines

> 本项目是 Vue 3,无 React hooks。本节对应 Vue 的 composables 与组合式 API 约定。

---

## Overview

- 本项目**未使用自定义 composables**,共享逻辑通过 store + 纯函数组织。
- 页面固定结构:`<script setup lang="ts">` + computed / watch。

---

## Data Fetching

- 统一在 `services/coreApi.ts` 封装裸 fetch:

```ts
const res = await fetch(url, { headers: { 'X-HospitalAI-Role': role } })
if (!res.ok) throw new Error('中文错误信息')
```

- 无 axios / 拦截器 / React Query。
- 角色走 `X-HospitalAI-Role` header。
- vite proxy `/api` → localhost:8080,`VITE_CORE_API_BASE` 可覆盖。

---

## Watch Pattern

- 跨页面同步靠 `watch(() => flow.revision, reload)`。
- 不要在 watch 里做重逻辑,只触发 reload / 派生。

---

## 降级数据获取

- `VITE_UI_PREVIEW==='true'` → 用 flowSimulation 场景。
- 再降级 → previewData.ts 内置数据。
- 错误 catch 后落 preview,消息塞进 `store.error` 用 el-alert 展示。

---

## Common Mistakes

- 把 React hooks 思路带进 Vue(useEffect 等)。
- 数据获取逻辑散落在组件内,而不是 `services/coreApi.ts`。
- 忽略 `X-HospitalAI-Role` 头 → 越权 403。
