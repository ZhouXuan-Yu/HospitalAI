<template>
  <div class="product-page">
    <header class="page-heading">
      <div><h1>患者工作列表</h1><p>按风险和推荐状态处理当前住院患者，患者事实与决策记录均保留来源和版本。</p></div>
      <div class="page-heading-actions"><el-button :icon="RefreshCw" :loading="loading" @click="loadWorklist">刷新列表</el-button><el-button type="primary" :icon="UserRoundSearch">读取 HIS 患者上下文</el-button></div>
    </header>

    <section class="summary-strip" aria-label="患者队列摘要">
      <div class="summary-item"><div class="summary-icon"><UsersRound :size="18" /></div><div><strong>5</strong><span>当前住院患者</span></div></div>
      <div class="summary-item"><div class="summary-icon danger"><ShieldX :size="18" /></div><div><strong>1</strong><span>硬阻断待处理</span></div></div>
      <div class="summary-item"><div class="summary-icon warning"><TriangleAlert :size="18" /></div><div><strong>2</strong><span>强提醒待复核</span></div></div>
      <div class="summary-item"><div class="summary-icon blue"><Clock3 :size="18" /></div><div><strong>3</strong><span>推荐尚未决策</span></div></div>
    </section>

    <div class="toolbar-band">
      <el-input v-model="query" :prefix-icon="Search" placeholder="患者姓名、住院号或诊断" clearable />
      <el-select v-model="riskFilter" aria-label="风险等级"><el-option label="全部风险" value="all" /><el-option label="硬阻断" value="block" /><el-option label="强提醒" value="strong" /><el-option label="一般提示" value="info" /></el-select>
      <el-select v-model="statusFilter" aria-label="推荐状态"><el-option label="全部状态" value="all" /><el-option label="待生成" value="pending" /><el-option label="待决策" value="generated" /><el-option label="待药师复核" value="review" /></el-select>
      <el-select model-value="呼吸内科" aria-label="主管科室"><el-option label="呼吸内科" value="呼吸内科" /></el-select>
      <span class="toolbar-spacer"></span><span class="worklist-updated"><CircleCheck :size="14" />患者快照更新于 10:24</span>
    </div>

    <section class="surface-panel">
      <div class="surface-panel-header"><h2>我的待处理患者</h2><span>{{ filteredRows.length }} 条 · 按风险优先级排序</span></div>
      <div class="worklist-table-wrap">
        <table class="dense-table worklist-table">
          <thead><tr><th>患者 / 当前就诊</th><th>诊断</th><th>关键风险</th><th>推荐状态</th><th>最新变化</th><th>主管医生</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.encounterId">
              <td><div class="patient-cell"><span>{{ row.displayName.slice(-1) }}</span><div><strong>{{ row.displayName }}</strong><small>{{ row.sex === 'F' ? '女' : '男' }} · {{ row.age }}岁 · {{ row.sourcePatientId }}</small><small>{{ row.department }} · {{ row.encounterId }} · v{{ row.dataVersion }}</small></div></div></td>
              <td><strong class="diagnosis-cell">{{ row.diagnosis }}</strong><small class="cell-subtext">入院 {{ formatTime(row.admittedAt) }}</small></td>
              <td><span class="status-pill" :class="riskMeta(row).className"><span class="dot"></span>{{ riskMeta(row).label }}</span><small class="cell-subtext">{{ riskMeta(row).detail }}</small></td>
              <td><span class="status-pill info"><span class="dot"></span>{{ statusMeta(row).label }}</span><small class="cell-subtext">{{ statusMeta(row).detail }}</small></td>
              <td><span>{{ latestChange(row) }}</span><small class="cell-subtext">10:{{ 24 - Number(row.patientId.slice(-1)) }}</small></td>
              <td><span>陈医生</span><small class="cell-subtext">呼吸内科病区</small></td>
              <td><div class="row-actions"><el-button size="small" type="primary" @click="openWorkbench(row.encounterId)">进入决策</el-button><el-dropdown trigger="click"><el-button :icon="MoreHorizontal" size="small" circle aria-label="更多患者操作" /><template #dropdown><el-dropdown-menu><el-dropdown-item @click="openOverview(row.patientId)">患者用药全景</el-dropdown-item><el-dropdown-item @click="openTimeline(row.patientId)">长期用药追踪</el-dropdown-item><el-dropdown-item>查看原始快照</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck, Clock3, MoreHorizontal, RefreshCw, Search, ShieldX, TriangleAlert, UserRoundSearch, UsersRound } from 'lucide-vue-next'
import { loadWorklist } from '../services/dataAccess'
import type { WorklistItem } from '../services/coreApi'

const router = useRouter()
const query = ref('')
const riskFilter = ref('all')
const statusFilter = ref('all')
const loading = ref(false)
const rows = ref<WorklistItem[]>([])

async function loadWorklist() {
  loading.value = true
  try {
    rows.value = await loadWorklist()
  } finally {
    loading.value = false
  }
}

const filteredRows = computed(() => rows.value.filter(row => {
  const matchesQuery = !query.value || `${row.displayName}${row.sourcePatientId}${row.diagnosis}`.toLowerCase().includes(query.value.toLowerCase())
  const risk = riskMeta(row).level
  return matchesQuery && (riskFilter.value === 'all' || riskFilter.value === risk) && (statusFilter.value === 'all' || statusMeta(row).status === statusFilter.value)
}))

onMounted(loadWorklist)

function riskMeta(row: WorklistItem) {
  if (row.scenario === 'confirmed_allergy_second_admission') return { level: 'block', label: '硬阻断', detail: '确认过敏已继承', className: 'danger' }
  if (row.scenario === 'severe_adr' || row.scenario.includes('cross_department')) return { level: 'strong', label: '强提醒', detail: row.scenario === 'severe_adr' ? '历史严重 ADR' : '跨科室用药冲突', className: 'warning' }
  if (row.scenario === 'critical_lab_missing') return { level: 'info', label: '信息缺失', detail: '2 项关键检验未知', className: 'info' }
  return { level: 'none', label: '未命中阻断', detail: '仍需医生核对', className: '' }
}
function statusMeta(row: WorklistItem) { return row.scenario === 'normal' ? { status: 'generated', label: '待医生决策', detail: '3 个候选已生成' } : { status: 'review', label: '安全审查中', detail: '等待风险处理' } }
function latestChange(row: WorklistItem) { return row.scenario === 'critical_lab_missing' ? 'LIS 回传缺失状态' : row.scenario.includes('cross_department') ? '心内科新增有效医嘱' : '患者快照已更新' }
function formatTime(value: string) { return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) }
function openWorkbench(id: string) { router.push(`/doctor/workbench/${id}`) }
function openOverview(id: string) { router.push(`/doctor/patients/${id}`) }
function openTimeline(id: string) { router.push(`/doctor/timeline/${id}`) }
</script>

<style scoped>
.worklist-updated { display: flex; align-items: center; gap: 5px; color: #58726d; font-size: 9px; }
.worklist-table-wrap { overflow-x: auto; }
.worklist-table { min-width: 1050px; }
.worklist-table th:first-child { width: 210px; }
.patient-cell { display: flex; align-items: flex-start; gap: 8px; }
.patient-cell > span { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 5px; background: #e5efee; color: #125f5b; font-weight: 800; }
.patient-cell > div { min-width: 0; display: grid; gap: 2px; }
.patient-cell strong { font-size: 11px; }
.patient-cell small, .cell-subtext { display: block; margin-top: 3px; color: #718088; font-size: 8px; line-height: 1.35; }
.diagnosis-cell { display: block; max-width: 180px; font-size: 10px; line-height: 1.4; }
.row-actions { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
</style>
