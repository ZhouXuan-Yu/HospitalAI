# Type Safety

> Type safety patterns in this project.

---

## Type System

- **TypeScript**(冻结),strict 模式 + `vue-tsc --noEmit` 构建检查。
- 类型定义在 service 或 types 文件导出;`types/flowScenario.ts` 复引 coreApi 类型。

---

## Type Organization

```text
types/flowScenario.ts   # 场景类型,复引 coreApi 类型
services/coreApi.ts     # API 响应类型
```

- 共享类型放 `types/`,页面局部类型内联。
- 跨 service 共享的类型在 `types/` 定义,不各写一份。

---

## Runtime Validation

- **JSON Schema + Ajv2020 运行时校验**:

```ts
import Ajv2020 from 'ajv/dist/2020'
import scenarioSchema from '@/contracts/flowScenario.schema.json'

const ajv = new Ajv2020()
const validate = ajv.compile<FlowScenario>(scenarioSchema)
```

- schema 用 `"additionalProperties": false` + `required` 强制结构。
- 读 localStorage / 外部 JSON 必须过 Ajv,失败则清除/拒绝。

---

## Forbidden Patterns

- **基本不用 `any`**。
- 用 `Record<string, unknown>` 表示未知对象。
- 降级路径才用 `as` 断言(`workbench.ts` 的 preview 回退)。
- 避免双下划线开头的空壳类型。

---

## Common Patterns

```ts
// 未知对象 → Record
const payload = JSON.parse(raw) as Record<string, unknown>

// 类型守卫 / satisfies
const ok = { ... } satisfies FlowScenario
```

- 新增字段要同步 JSON Schema 与 TypeScript 类型,不能只改一处。
