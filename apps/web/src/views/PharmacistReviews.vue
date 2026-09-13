<template>
  <div class="product-page pharmacist-review-page">
    <header class="review-page-heading">
      <div>
        <div class="eyebrow"><ShieldCheck :size="14" /> 药师工作台 / 当日医嘱审核</div>
        <h1>处方审核</h1>
        <p>以科室为工作范围，以当天未审核医嘱为审核单位；联合用药只核对患者当天有效医嘱。</p>
      </div>
      <div class="review-heading-actions">
        <span class="synthetic-note">预览数据 · {{ reviewDate }}</span>
        <el-button :icon="RefreshCw" :loading="loading" @click="loadReviews">刷新当天医嘱</el-button>
      </div>
    </header>

    <section class="department-bar" aria-label="审核范围">
      <div class="department-selector">
        <span class="bar-label">负责科室</span>
        <el-select v-model="department" size="default" aria-label="选择负责科室">
          <el-option v-for="item in departments" :key="item" :label="item" :value="item" />
        </el-select>
      </div>
      <div class="department-stats">
        <span><strong>{{ departmentRows.length }}</strong> 条当日医嘱</span>
        <span class="warning-text"><strong>{{ abnormalCount }}</strong> 条需关注</span>
        <span class="success-text"><strong>{{ passedCount }}</strong> 条自动通过</span>
        <span><strong>{{ pendingCount }}</strong> 条待药师处理</span>
      </div>
    </section>

    <section class="review-workspace-new" :class="{ 'detail-closed': !selectedRow }">
      <section class="order-table-panel" aria-label="当日未审核医嘱列表">
        <div class="order-table-toolbar">
          <div>
            <h2>{{ department }} · 当日未审核医嘱</h2>
            <span>一行代表一条药品医嘱，同一患者的其他当日有效医嘱在右侧详情中核对</span>
          </div>
          <div class="order-table-filters">
            <el-input v-model="query" :prefix-icon="Search" clearable placeholder="搜索患者、药品或医嘱号" />
            <el-checkbox v-model="onlyAbnormal">仅看异常</el-checkbox>
          </div>
        </div>

        <div v-if="loading" class="order-loading"><el-skeleton :rows="8" animated /></div>
        <div v-else-if="!filteredRows.length" class="order-empty">
          <ClipboardCheck :size="28" />
          <strong>当前科室没有符合条件的未审核医嘱</strong>
          <span>请切换科室、清除筛选或刷新当天数据。</span>
        </div>
        <div v-else class="order-table-scroll">
          <table class="order-review-table">
            <thead>
              <tr>
                <th>审核状态</th>
                <th>患者基本信息</th>
                <th>当天药品医嘱</th>
                <th>单医嘱审查</th>
                <th>联合用药审查</th>
                <th>自动审核结果</th>
                <th>医嘱有效时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredRows" :key="row.rowId" :class="{ selected: selectedRow?.rowId === row.rowId, abnormal: row.abnormal }" @click="selectedRowId = row.rowId">
                <td><span class="order-status" :class="row.source.levelClass"><i></i>{{ row.source.level }}</span></td>
                <td><div class="patient-cell"><strong>{{ row.source.patient }}</strong><span>{{ row.source.encounter }} · {{ row.source.department }}</span></div></td>
                <td><div class="drug-cell"><strong>{{ row.drugName }}</strong><span>{{ row.orderSummary }}</span><small>{{ row.source.id }}</small></div></td>
                <td><span class="audit-result" :class="row.singleClass">{{ row.singleResult }}</span></td>
                <td><span class="audit-result" :class="row.comboClass">{{ row.comboResult }}</span></td>
                <td><div class="auto-result"><strong>{{ row.autoResult }}</strong><span>{{ row.ruleSummary }}</span></div></td>
                <td><span class="order-window">{{ row.orderWindow }}</span></td>
                <td><el-button text size="small" :icon="row.abnormal ? ShieldAlert : Search" @click.stop="selectedRowId = row.rowId">查看</el-button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside v-if="selectedRow" class="order-detail-panel" aria-label="当日医嘱审核详情">
        <header class="order-detail-heading">
          <div><span class="selection-kicker">当前审核医嘱</span><h2>{{ selectedRow.drugName }}</h2><p>{{ selectedRow.source.id }} · 审核日期 {{ reviewDate }}</p></div>
          <el-button :icon="X" circle text aria-label="关闭医嘱详情" @click="selectedRowId = ''" />
        </header>

        <section class="detail-patient-brief">
          <div class="detail-avatar">{{ selectedRow.source.patient.slice(-1) }}</div>
          <div><strong>{{ selectedRow.source.patient }}</strong><span>{{ selectedRow.source.encounter }} · {{ selectedRow.source.department }}</span><small>当前诊断：{{ selectedRow.source.title }}</small></div>
        </section>

        <section class="order-fact-table">
          <div><dt>药品</dt><dd>{{ selectedRow.drugName }}</dd><small>当前医嘱</small></div>
          <div><dt>给药信息</dt><dd>{{ selectedRow.orderSummary }}</dd><small>接口返回</small></div>
          <div><dt>开始时间</dt><dd>{{ selectedRow.orderWindow }}</dd><small>{{ selectedRow.isLongTerm ? '持续用药' : '当日医嘱' }}</small></div>
          <div><dt>审核范围</dt><dd>{{ reviewDate }} 当天有效医嘱</dd><small>按日审核</small></div>
        </section>

        <section class="auto-audit-section">
          <div class="detail-section-heading"><div><span class="selection-kicker">知识库自动审核</span><h3>单医嘱与联合用药结果</h3></div><span class="auto-audit-badge" :class="selectedRow.abnormal ? 'warning' : 'success'">{{ selectedRow.autoResult }}</span></div>
          <div class="audit-result-grid">
            <div><span>单医嘱合理性</span><strong :class="selectedRow.singleClass">{{ selectedRow.singleResult }}</strong><small>药品目录、医嘱字段与患者安全事实</small></div>
            <div><span>联合用药合理性</span><strong :class="selectedRow.comboClass">{{ selectedRow.comboResult }}</strong><small>仅核对患者当天其他有效医嘱</small></div>
          </div>
          <div class="rule-hit-compact"><ShieldAlert :size="16" /><div><strong>{{ selectedRow.ruleSummary }}</strong><p>{{ selectedRow.source.reason || '完整命中事实与规则详情由审核服务返回。' }}</p></div></div>
        </section>

        <section class="same-day-medications">
          <div class="detail-section-heading"><div><span class="selection-kicker">联合用药上下文</span><h3>患者当天其他有效医嘱</h3></div><span>{{ sameDayDrugs.length }} 条</span></div>
          <div v-if="sameDayDrugs.length" class="same-day-drug-list">
            <div v-for="drug in sameDayDrugs" :key="drug.name" :class="{ current: drug.name === selectedRow.drugName }"><Pill :size="15" /><strong>{{ drug.name }}</strong><span>{{ drug.current ? '当前审核' : '同日其他有效医嘱' }}</span></div>
          </div>
          <p v-else class="detail-muted">当前接口未返回患者当天其他有效医嘱。</p>
        </section>

        <section class="pharmacist-resolution">
          <label><span>药师审核结论 <em>必填</em></span><el-select v-model="resolution" placeholder="请选择处理结果"><el-option label="审核通过" value="approved" /><el-option label="标记疑问并通知医生" value="question" /><el-option label="退回医生修改" value="returned" /></el-select></label>
          <label><span>审核说明 <em>必填</em></span><el-input v-model="resolutionNote" type="textarea" :rows="3" placeholder="记录单医嘱判断、联合用药判断和后续处理" /></label>
          <el-button type="primary" :icon="CheckCircle2" :disabled="!resolution || !resolutionNote.trim() || resolving" :loading="resolving" @click="completeReview">保存本条审核</el-button>
          <span v-if="resolveMessage" class="resolve-feedback">{{ resolveMessage }}</span>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, ClipboardCheck, Pill, RefreshCw, Search, ShieldAlert, ShieldCheck, X } from 'lucide-vue-next'
import { loadPharmacistReviews, resolvePharmacistReview } from '../services/dataAccess'
import type { PharmacistReviewItem } from '../services/dataAccess'

type ReviewRow = {
  rowId: string
  source: PharmacistReviewItem
  drugName: string
  orderSummary: string
  orderWindow: string
  isLongTerm: boolean
  singleResult: string
  singleClass: string
  comboResult: string
  comboClass: string
  autoResult: string
  ruleSummary: string
  abnormal: boolean
}

const query = ref('')
const department = ref('呼吸内科')
const onlyAbnormal = ref(false)
const selectedRowId = ref('')
const loading = ref(false)
const resolution = ref('')
const resolutionNote = ref('')
const resolveMessage = ref('')
const resolving = ref(false)
const items = ref<PharmacistReviewItem[]>([])

const departments = computed(() => [...new Set(items.value.map(item => item.department).filter(Boolean))])
const reviewDate = computed(() => items.value[0]?.createdAt?.slice(0, 10) || '当天')
const departmentItems = computed(() => items.value.filter(item => item.department === department.value))
const departmentRows = computed(() => departmentItems.value.flatMap(toReviewRows))
const filteredRows = computed(() => departmentRows.value.filter(row => {
  const matchesQuery = !query.value || `${row.source.patient} ${row.source.encounter} ${row.drugName} ${row.source.id}`.toLowerCase().includes(query.value.toLowerCase())
  return matchesQuery && (!onlyAbnormal.value || row.abnormal)
}))
const selectedRow = computed(() => selectedRowId.value ? filteredRows.value.find(row => row.rowId === selectedRowId.value) : undefined)
const abnormalCount = computed(() => departmentRows.value.filter(row => row.abnormal).length)
const passedCount = computed(() => departmentRows.value.filter(row => !row.abnormal).length)
const pendingCount = computed(() => departmentRows.value.length)
const sameDayDrugs = computed(() => {
  const source = selectedRow.value?.source
  if (!source) return []
  return source.drugs.split(' · ').filter(Boolean).map(name => ({ name, current: name === selectedRow.value?.drugName }))
})

function toReviewRows(item: PharmacistReviewItem): ReviewRow[] {
  const drugs = item.drugs.split(' · ').filter(Boolean)
  const conflict = /冲突|重复|联合|跨科室|相互作用/.test(`${item.title} ${item.kind} ${item.reason || ''}`)
  const singleConcern = item.levelClass === 'danger' || /ADR|剂量|过敏|不良反应/.test(`${item.title} ${item.kind}`)
  return (drugs.length ? drugs : ['待接口返回药品']).map((drugName, index) => {
    const abnormal = item.levelClass !== 'info' || conflict || singleConcern
    return {
      rowId: `${item.id}-${index + 1}`,
      source: item,
      drugName,
      orderSummary: item.kind === '跨科室协同' ? '给药信息待详情接口返回' : '当日有效医嘱 · 具体字段待接口返回',
      orderWindow: item.kind.includes('长期') ? '开始时间至结束时间 · 未停用' : '当日开立 · 未停用',
      isLongTerm: item.kind.includes('长期'),
      singleResult: singleConcern ? '需复核' : '自动通过',
      singleClass: singleConcern ? 'danger-text' : 'success-text',
      comboResult: conflict ? '发现同日问题' : '未发现冲突',
      comboClass: conflict ? 'warning-text' : 'success-text',
      autoResult: item.levelClass === 'danger' ? '强提醒' : conflict ? '存在冲突' : '自动通过',
      ruleSummary: item.ruleVersion || (conflict ? '联合用药规则待确认' : '规则校验通过'),
      abnormal
    }
  })
}

async function loadReviews() {
  loading.value = true
  try {
    const payload = await loadPharmacistReviews()
    items.value = payload.items
    if (!departments.value.includes(department.value)) department.value = departments.value[0] || ''
    selectedRowId.value = ''
    resolution.value = ''
    resolutionNote.value = ''
  } finally {
    loading.value = false
  }
}

async function completeReview() {
  if (!selectedRow.value || !resolution.value || !resolutionNote.value.trim()) return
  resolving.value = true
  try {
    await resolvePharmacistReview(selectedRow.value.source.id, resolution.value)
    resolveMessage.value = `${selectedRow.value.source.id} 已保存本次审核记录。`
    resolution.value = ''
    resolutionNote.value = ''
    await loadReviews()
  } catch (error) {
    resolveMessage.value = `审核保存失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    resolving.value = false
  }
}

onMounted(loadReviews)
</script>

<style scoped>
.pharmacist-review-page { min-width: 0; }
.review-page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
.eyebrow { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: #126b66; font-size: 10px; font-weight: 750; }
.review-page-heading h1 { margin: 0; color: #1d3942; font-size: 24px; }
.review-page-heading p { margin: 6px 0 0; color: #65777e; font-size: 11px; }
.review-heading-actions { display: flex; align-items: center; gap: 10px; }
.synthetic-note { color: #8a681b; font-size: 10px; white-space: nowrap; }
.department-bar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid #dce7e7; border-radius: 6px; background: #fbfdfd; }
.department-selector, .department-stats { display: flex; align-items: center; gap: 9px; }
.bar-label { color: #506970; font-size: 11px; font-weight: 750; }
.department-selector .el-select { width: 170px; }
.department-stats { flex-wrap: wrap; justify-content: flex-end; color: #61747b; font-size: 10px; }
.department-stats span { padding-left: 10px; border-left: 1px solid #dce7e7; }
.department-stats strong { color: #263f47; font-size: 13px; }
.warning-text { color: #a06c1a !important; }.warning-text strong { color: #a06c1a; }
.success-text { color: #28745b !important; }.success-text strong { color: #28745b; }
.danger-text { color: #b23b45 !important; }.danger-text strong { color: #b23b45; }
.review-workspace-new { display: grid; grid-template-columns: minmax(0, 1fr) minmax(380px, 42%); gap: 12px; min-height: 640px; }
.review-workspace-new.detail-closed { grid-template-columns: 1fr; }
.order-table-panel, .order-detail-panel { min-width: 0; background: #fff; border: 1px solid #dce5e6; border-radius: 7px; }
.order-table-panel { overflow: hidden; }
.order-table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 15px; border-bottom: 1px solid #e1e9e9; }
.order-table-toolbar h2 { margin: 0 0 4px; color: #23414a; font-size: 14px; }.order-table-toolbar span { color: #728189; font-size: 9px; }
.order-table-filters { display: flex; align-items: center; gap: 10px; }.order-table-filters .el-input { width: 230px; }
.order-table-scroll { overflow: auto; }.order-review-table { width: 100%; min-width: 1030px; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
.order-review-table th { padding: 9px 8px; background: #f5f8f8; color: #60737a; font-size: 9px; font-weight: 800; text-align: left; white-space: nowrap; }
.order-review-table td { height: 70px; padding: 9px 8px; border-top: 1px solid #e6eded; vertical-align: middle; }.order-review-table tbody tr { cursor: pointer; }.order-review-table tbody tr:hover { background: #f7fbfa; }.order-review-table tbody tr.selected { background: #eef8f5; box-shadow: inset 3px 0 #126b66; }.order-review-table tbody tr.abnormal td:first-child { border-left-color: #cf7c29; }
.order-status { display: inline-flex; align-items: center; gap: 5px; color: #60737a; font-size: 9px; font-weight: 750; white-space: nowrap; }.order-status i { width: 6px; height: 6px; border-radius: 50%; background: #708188; }.order-status.warning { color: #9a651c; }.order-status.warning i { background: #c38225; }.order-status.danger { color: #ae3640; }.order-status.danger i { background: #b83c46; }
.patient-cell, .drug-cell, .auto-result { display: grid; gap: 3px; min-width: 0; }.patient-cell strong, .drug-cell strong { overflow: hidden; color: #263f47; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.patient-cell span, .drug-cell span, .drug-cell small, .auto-result span { overflow: hidden; color: #75848a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.drug-cell strong { color: #173f47; font-size: 12px; }.drug-cell small { color: #a1adb0; }.audit-result { display: inline-block; font-size: 10px; font-weight: 800; line-height: 1.4; }.auto-result strong { color: #365960; font-size: 10px; }.order-window { color: #5f737a; font-size: 9px; line-height: 1.45; }
.order-loading { padding: 24px; }.order-empty { display: grid; place-items: center; align-content: center; min-height: 460px; gap: 9px; color: #718088; }.order-empty strong { color: #38545e; font-size: 13px; }.order-empty span { font-size: 10px; }
.order-detail-panel { overflow: auto; padding: 15px; }.order-detail-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid #e1e9e9; }.order-detail-heading h2 { margin: 5px 0 3px; color: #173f47; font-size: 19px; }.order-detail-heading p { margin: 0; color: #75848a; font-size: 9px; }
.detail-patient-brief { display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 9px; align-items: center; margin-top: 12px; padding: 10px; background: #f4f8f8; }.detail-avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #dceeea; color: #126b66; font-size: 13px; font-weight: 800; }.detail-patient-brief div:last-child { display: grid; gap: 3px; }.detail-patient-brief strong { color: #294951; font-size: 11px; }.detail-patient-brief span, .detail-patient-brief small { color: #6c7c82; font-size: 9px; }
.order-fact-table { display: grid; gap: 0; margin-top: 12px; border: 1px solid #dce7e7; border-radius: 5px; overflow: hidden; }.order-fact-table div { display: grid; grid-template-columns: 74px minmax(0,1fr) 68px; gap: 8px; align-items: center; padding: 8px 9px; border-bottom: 1px solid #e7eeee; }.order-fact-table div:last-child { border-bottom: 0; }.order-fact-table dt { color: #667a81; font-size: 9px; font-weight: 750; }.order-fact-table dd { margin: 0; color: #294951; font-size: 10px; font-weight: 700; }.order-fact-table small { color: #a06c1a; font-size: 8px; text-align: right; }
.auto-audit-section, .same-day-medications { margin-top: 14px; }.detail-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }.detail-section-heading h3 { margin: 3px 0 0; color: #294951; font-size: 13px; }.detail-section-heading > span { color: #74848b; font-size: 9px; }.auto-audit-badge { padding: 4px 7px; border-radius: 4px; background: #edf7f3; color: #28745b; font-size: 9px; font-weight: 800; }.auto-audit-badge.warning { background: #fff4e5; color: #9a651c; }
.audit-result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }.audit-result-grid > div { display: grid; gap: 4px; padding: 9px; border: 1px solid #e0e9e9; border-radius: 5px; background: #fbfdfd; }.audit-result-grid span { color: #6d7e84; font-size: 9px; }.audit-result-grid strong { font-size: 12px; }.audit-result-grid small { color: #8a999e; font-size: 8px; line-height: 1.4; }.rule-hit-compact { display: flex; align-items: flex-start; gap: 7px; margin-top: 8px; padding: 9px; background: #fff8eb; color: #95631c; }.rule-hit-compact > div { display: grid; gap: 3px; }.rule-hit-compact strong { font-size: 10px; }.rule-hit-compact p { margin: 0; color: #856d4a; font-size: 9px; line-height: 1.45; }
.same-day-drug-list { display: grid; gap: 5px; }.same-day-drug-list div { display: flex; align-items: center; gap: 7px; padding: 8px 9px; border: 1px solid #e1e9e9; border-radius: 4px; color: #385961; }.same-day-drug-list div.current { border-color: #abd2c3; background: #edf8f4; color: #126b66; }.same-day-drug-list strong { font-size: 10px; }.same-day-drug-list span { margin-left: auto; color: #829095; font-size: 8px; }.detail-muted { color: #839197; font-size: 9px; }
.pharmacist-resolution { display: grid; gap: 9px; margin-top: 15px; padding-top: 12px; border-top: 1px solid #dfe8e8; }.pharmacist-resolution label { display: grid; gap: 5px; }.pharmacist-resolution label > span { color: #62757c; font-size: 9px; }.pharmacist-resolution em { color: #b53740; font-style: normal; }.resolve-feedback { color: #28745b; font-size: 9px; }
@media (max-width: 1200px) { .review-workspace-new { grid-template-columns: 1fr; }.order-detail-panel { max-height: none; }.department-bar, .review-page-heading, .order-table-toolbar { align-items: flex-start; flex-direction: column; }.department-stats { justify-content: flex-start; }.order-table-filters { width: 100%; }.order-table-filters .el-input { flex: 1; width: auto; } }
</style>
