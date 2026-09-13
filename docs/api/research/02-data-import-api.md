# 数据提取与导入页面 API

## 页面目标

接收外部研究数据，校验来源、版本、字段、类型和行级质量，发布标准化候选数据集。

## 演示适配器

前端导入 `hospitalai.research-dataset.v1` JSON：

```json
{
  "schemaVersion": "hospitalai.research-dataset.v1",
  "metadata": { "synthetic": true, "source": "fixture generator" },
  "research": { "project": {}, "historicalRecords": [], "variables": [] }
}
```

运行时由 Ajv 校验。内置文件：`/research/nvaf-doac-comparative.synthetic.v1.json`。导入后调用与后端一致的领域动作，不在页面代码中写死记录。

## 生产保留契约

- `POST /api/research/projects/{projectId}/imports`：`multipart/form-data` 上传 `.xlsx/.json`，请求头含 `Idempotency-Key`。
- `GET /api/research/imports/{importId}`：返回状态、文件 SHA-256、总行数、接受/拒绝数。
- `GET /api/research/imports/{importId}/errors`：下载行号、字段、错误码和处理建议。
- `POST /api/research/imports/{importId}/publish`：事务发布标准化记录。

失败不得部分发布。真实数据必须去标识化；上传需限制 MIME、大小、宏、公式、压缩炸弹和路径穿越。
