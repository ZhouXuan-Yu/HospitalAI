<template>
  <el-dialog v-model="flow.importDialogVisible" title="导入前端流程场景包" width="680px" :close-on-click-modal="false">
    <div class="scenario-boundary"><ShieldAlert :size="18"/><div><strong>仅接收合成模拟数据</strong><span>文件必须符合 <code>hospitalai.frontend-flow.v1</code>。导入会重置当前前端流程，不会上传文件或连接医院系统。</span></div></div>

    <section v-if="flow.scenario" class="current-scenario">
      <header><div><span>当前场景</span><strong>{{ flow.scenario.metadata.name }}</strong></div><el-tag type="success" effect="plain">Schema 已验证</el-tag></header>
      <dl><div><dt>场景版本</dt><dd>{{ flow.scenario.metadata.version }}</dd></div><div><dt>患者 / 就诊</dt><dd>{{ flow.worklist.length }}</dd></div><div><dt>科研历史记录</dt><dd>{{ flow.scenario.research.historicalRecords.length }}</dd></div><div><dt>导入来源</dt><dd>{{ flow.sourceName }}</dd></div></dl>
      <p>{{ flow.scenario.metadata.disclaimer }}</p>
    </section>

    <label class="json-dropzone" :class="{ loading: flow.loading }">
      <input ref="fileInput" type="file" accept="application/json,.json" @change="readFile"/>
      <UploadCloud :size="28"/>
      <strong>选择 JSON 场景包</strong>
      <span>本地解析并通过 JSON Schema 校验，文件不会离开浏览器</span>
      <el-button type="primary" plain :loading="flow.loading">选择文件</el-button>
    </label>

    <el-alert v-if="successMessage" type="success" :title="successMessage" :closable="false" show-icon/>
    <el-alert v-if="errorMessage" type="error" :title="errorMessage" :closable="false" show-icon/>
    <ul v-if="flow.validationErrors.length" class="validation-errors"><li v-for="error in flow.validationErrors" :key="error"><CircleX :size="13"/>{{ error }}</li></ul>

    <template #footer>
      <a class="el-button" href="/scenarios/cap-full-flow.v1.json" download="cap-full-flow.v1.json"><Download :size="14"/>下载示例包</a>
      <el-button :icon="RotateCcw" @click="resetWorkflow">重置当前流程</el-button>
      <el-button :icon="Database" :loading="flow.loading" @click="loadBundled">载入内置示例</el-button>
      <el-button type="primary" @click="flow.importDialogVisible=false">完成</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CircleX, Database, Download, RotateCcw, ShieldAlert, UploadCloud } from 'lucide-vue-next'
import { useFlowSimulationStore } from '../stores/flowSimulation'

const flow = useFlowSimulationStore()
const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

async function readFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorMessage.value = ''
  successMessage.value = ''
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = '场景包超过 5 MB，已拒绝导入。'
    return
  }
  try {
    await flow.importText(await file.text(), file.name)
    successMessage.value = `已导入 ${file.name}，流程状态已重置。`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '场景包导入失败'
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function loadBundled() {
  errorMessage.value = ''
  try {
    await flow.loadBundledScenario()
    successMessage.value = '已重新载入内置 CAP 全流程示例包。'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '内置示例读取失败'
  }
}

function resetWorkflow() {
  flow.resetWorkflow()
  successMessage.value = '患者数据保持不变，医生与科研流程状态已重置。'
}
</script>

<style scoped>
.scenario-boundary{display:flex;gap:9px;padding:10px 12px;border:1px solid #e4c982;border-radius:5px;background:#fff8e7;color:#74510c}.scenario-boundary>div{display:grid;gap:2px}.scenario-boundary strong{font-size:11px}.scenario-boundary span{font-size:9px;line-height:1.5}.current-scenario{margin:12px 0;border:1px solid #d6e1e3;border-radius:6px;background:#f8fafb}.current-scenario header{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-bottom:1px solid #dfe7e9}.current-scenario header>div{display:grid;gap:2px}.current-scenario header span{color:#6d7c84;font-size:8px}.current-scenario header strong{font-size:11px}.current-scenario dl{display:grid;grid-template-columns:repeat(4,1fr);margin:0}.current-scenario dl>div{padding:9px 12px;border-right:1px solid #e0e7e9}.current-scenario dl>div:last-child{border-right:0}.current-scenario dt{color:#718088;font-size:8px}.current-scenario dd{margin:3px 0 0;overflow:hidden;font-size:9px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.current-scenario p{margin:0;padding:8px 12px;border-top:1px solid #e0e7e9;color:#7b5b1c;font-size:8px}.json-dropzone{min-height:160px;display:grid;place-items:center;align-content:center;gap:7px;border:1px dashed #9eb8bd;border-radius:6px;background:#f5f9fa;color:#2d6970;cursor:pointer}.json-dropzone:hover{border-color:#16766e;background:#edf7f5}.json-dropzone input{display:none}.json-dropzone strong{font-size:12px}.json-dropzone span{color:#6b7c84;font-size:9px}.json-dropzone.loading{pointer-events:none;opacity:.65}.validation-errors{display:grid;gap:5px;max-height:110px;margin:10px 0 0;padding:8px 10px;overflow:auto;border:1px solid #efc5c5;background:#fff4f4;list-style:none}.validation-errors li{display:flex;align-items:flex-start;gap:5px;color:#a33a3a;font-size:8px}.el-alert{margin-top:10px}:deep(.el-dialog__footer){display:flex;justify-content:flex-end;gap:7px}:deep(.el-dialog__footer .el-button){margin-left:0}.el-button[href]{display:inline-flex;align-items:center;gap:6px;text-decoration:none}
</style>
