# Component Guidelines

> Component patterns, props, composition.

---

## Script Setup

全部组件用组合式 API:

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
</script>
```

---

## Props / Emits

**本项目不用 props/emits 做组件间通信**。组件间靠 Pinia store 共享状态:

```vue
<script setup lang="ts">
import { useWorkbenchStore } from '@/stores/workbench'
const store = useWorkbenchStore()
// 模板直接 store.payload.xxx
</script>
```

不用 `mapState` / `mapActions`,直接访问 store。

---

## Page Structure

每个页面固定结构:

```text
<template>
  <div class="page">
    <header class="topbar">...</header>
    <el-alert v-if="store.error">...</el-alert>
    <el-skeleton v-if="loading">...</el-skeleton>
    <main>...</main>
  </div>
</template>

<script setup lang="ts">...</script>

<style scoped>...</style>
```

---

## Derived State

- 用 computed 派生展示数据,不手写可变派生。
- 用小的纯函数映射枚举到文案/图标(如 riskLabel / riskIcon)。

---

## Cross-Page Sync

跨页面同步靠 `watch(() => flow.revision)` 触发重新拉取/刷新:

```ts
watch(() => flow.revision, () => { /* reload */ })
```

---

## Common Patterns

- 表单禁用态用 computed 派生,不用第三方校验库。
- 每个页面暴露 `data-testid` 供 Playwright e2e 使用。
- 交互组件优先 Element Plus 的按钮、表格、分段控件、抽屉、弹窗。

---

## Common Mistakes

- 引入 props/emits 做页面间通信,绕过 store → 状态不同步。
- 忘记 `revision` 监听,跨页面数据不刷新。
- 用 mapState,而不是直接访问 store。
- 用校验库做表单,而不是 computed 派生禁用态。
