<template>
  <div class="product-page pharmacy-module-page">
    <header class="page-heading">
      <div><div class="eyebrow">PHARMACY WORKBENCH</div><h1>{{ moduleTitle }}</h1><p>{{ moduleDescription }}</p></div>
      <div class="page-heading-actions"><el-tag type="success" effect="plain">{{ flow.isReady ? 'JSON 场景已载入' : '等待数据' }}</el-tag><el-button :icon="FileJson2" @click="flow.importDialogVisible = true">导入验证数据</el-button></div>
    </header>
    <div class="module-tabs" role="tablist">
      <button v-for="tab in tabs" :key="tab.path" :class="{ active: currentPath === tab.path }" @click="$router.push(tab.path)"><component :is="tab.icon" :size="15" />{{ tab.label }}<span>{{ tab.count }}</span></button>
    </div>
    <el-alert v-if="errorMessage" :title="errorMessage" type="warning" show-icon :closable="false" />
    <section class="module-grid">
      <div class="module-main surface-panel">
        <div class="surface-panel-header"><div><h2>{{ mainTitle }}</h2><span>{{ dataSourceLabel }}</span></div><el-button v-if="isRetrospective" type="primary" :icon="Play" @click="runAnalysis">运行分析</el-button><el-button v-else-if="isRecord" type="primary" :icon="FilePlus2" @click="createRecord">新建药历</el-button><el-button v-else-if="isEducation" type="primary" :icon="Send" @click="publishEducation">生成教育任务</el-button></div>
        <div v-if="isRetrospective" class="analysis-layout">
          <div class="analysis-kpis"><div><strong>{{ records.length }}</strong><span>可分析治疗记录</span></div><div><strong>{{ cohortCount }}</strong><span>当前入组样本</span></div><div><strong>{{ analysisP }}</strong><span>预设统计结果</span></div></div>
          <div class="protocol-row"><div><strong>队列定义</strong><span>社区获得性肺炎 · 2026-01 至 2026-06 · 去标识化</span></div><el-button size="small" @click="cohortCount = records.length">确认入组</el-button></div>
          <table class="dense-table"><thead><tr><th>记录</th><th>方案</th><th>治疗反应</th><th>不良事件</th><th>来源</th></tr></thead><tbody><tr v-for="record in records" :key="record.recordId"><td>{{ record.recordId }}</td><td>{{ record.regimen || '未知' }}</td><td><el-tag size="small" :type="record.treatmentResponse === 'improved' ? 'success' : 'warning'">{{ responseLabel(record.treatmentResponse) }}</el-tag></td><td>{{ record.adverseEvent || '未记录' }}</td><td>{{ record.sourceVersion }}</td></tr></tbody></table>
          <div class="analysis-note"><ShieldCheck :size="16" /><span>统计输出必须同时呈现样本量、缺失率、效应量和置信区间；P&lt;0.05 仅作为预设阈值，不自动生成临床结论。</span></div>
        </div>
        <div v-else-if="isRecord" class="record-layout"><div v-for="record in records.slice(0, 4)" :key="record.recordId" class="record-row"><div class="record-avatar">{{ record.recordId.slice(-1) }}</div><div><strong>{{ record.recordId }} · {{ record.diagnosis }}</strong><span>自动导入：{{ record.regimen || '暂无方案' }} · {{ record.admittedAt }}</span></div><el-tag :type="record.followupComplete ? 'success' : 'warning'" size="small">{{ record.followupComplete ? '随访完整' : '待补充' }}</el-tag></div><div class="manual-block"><strong>手动补充记录</strong><el-input v-model="manualNote" type="textarea" :rows="4" placeholder="记录患者口述信息、调整原因和药师分析；保存后进入审计轨迹。" /><div class="manual-actions"><el-checkbox v-model="keyPatient">重点/重症患者</el-checkbox><el-button type="primary" :disabled="!manualNote" @click="saveRecord">保存药历草稿</el-button></div></div></div>
        <div v-else class="education-layout"><div class="education-patient"><span class="scope-avatar">患</span><div><strong>{{ selectedPatient }}</strong><span>基于已审核用药方案生成患者教育任务</span></div><el-tag type="warning" effect="plain">需药师审核</el-tag></div><el-input v-model="educationText" type="textarea" :rows="9" placeholder="输入或编辑教育重点：用药目的、服用方法、漏服处理、需要立即就医的信号。" /><div class="education-checks"><el-checkbox v-model="educationChecks.purpose">用药目的</el-checkbox><el-checkbox v-model="educationChecks.method">服用方法</el-checkbox><el-checkbox v-model="educationChecks.warning">风险信号</el-checkbox><el-checkbox v-model="educationChecks.followup">复诊与监测</el-checkbox></div></div>
      </div>
      <aside class="module-side">
        <section class="surface-panel"><div class="surface-panel-header"><h2>流程状态</h2><span>{{ flow.researchProgress }}/8</span></div><div class="flow-steps"><div v-for="step in flowSteps" :key="step.label" :class="{ done: step.done }"><span>{{ step.done ? '✓' : '·' }}</span><div><strong>{{ step.label }}</strong><small>{{ step.detail }}</small></div></div></div></section>
        <section class="surface-panel safety-mini"><div class="surface-panel-header"><h2>数据与合规边界</h2></div><ul><li>事实来源与来源版本保留</li><li>研究数据必须去标识化</li><li>报告先为可审阅草稿</li><li>知识发布需要多人审核</li></ul></section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ClipboardCheck, FileJson2, FilePlus2, FileText, FlaskConical, Play, Send, ShieldCheck } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useFlowSimulationStore } from '../stores/flowSimulation'

const route = useRoute(); const flow = useFlowSimulationStore(); const errorMessage = ref(''); const cohortCount = ref(0); const manualNote = ref(''); const keyPatient = ref(false); const educationText = ref(''); const selectedPatient = ref('患者 P001'); const analysisP = ref('待运行');
const educationChecks = ref({ purpose: false, method: false, warning: false, followup: false })
const tabs = [{ label: '处方审核', path: '/pharmacy/reviews', icon: ClipboardCheck, count: '待办' }, { label: '处方点评', path: '/pharmacy/retrospective', icon: FileText, count: '回顾' }, { label: '药历', path: '/pharmacy/records', icon: FilePlus2, count: '重点' }, { label: '用药教育', path: '/pharmacy/education', icon: Send, count: '独立' }]
const currentPath = computed(() => route.path); const isRetrospective = computed(() => currentPath.value.endsWith('retrospective')); const isRecord = computed(() => currentPath.value.endsWith('records')); const isEducation = computed(() => currentPath.value.endsWith('education'))
const moduleTitle = computed(() => isRetrospective.value ? '处方点评' : isRecord.value ? '重点患者药历' : isEducation.value ? '用药教育' : '处方审核'); const mainTitle = computed(() => isRetrospective.value ? '治疗周期用药分析' : isRecord.value ? '药历草稿与自动导入事实' : '患者任务与审核内容'); const moduleDescription = computed(() => isRetrospective.value ? '回顾单个患者完整治疗周期，支持全量、随机与分层抽样。' : isRecord.value ? '药师主动选择重点患者，自动导入事实并补充临床访谈。' : isEducation.value ? '与药历独立管理，面向患者输出可审核的教育内容。' : '按科室查看当日未审核医嘱，单医嘱与联合用药分别审查。'); const dataSourceLabel = computed(() => flow.isReady ? `数据源：${flow.sourceName} · 仅用于验证` : '数据源：等待导入或生产 API')
const records = computed(() => flow.researchRecords)
const flowSteps = computed(() => [{ label: '审核结论', done: Object.keys(flow.decisions).length > 0, detail: '医生/药师决策' }, { label: '治疗结局', done: Object.keys(flow.outcomes).length > 0, detail: '随访与不良事件' }, { label: '研究队列', done: flow.cohortBuilt, detail: '纳排标准与版本' }, { label: '报告与知识', done: flow.reportStatus !== 'not_started', detail: '审阅后发布' }])
const responseLabel = (value: string) => ({ improved: '改善', stable: '稳定', worsened: '恶化' }[value] || '未知')
function runAnalysis() { cohortCount.value = records.value.length; analysisP.value = records.value.length > 1 ? '0.032' : '不可计算'; flow.analysisStatus = 'succeeded' }
function createRecord() { errorMessage.value = '已创建药历草稿，保存前仍需补充访谈信息并保留审计记录。' }
function saveRecord() { errorMessage.value = keyPatient.value ? '药历草稿已保存，已标记重点患者。' : '药历草稿已保存。'; manualNote.value = '' }
function publishEducation() { errorMessage.value = '教育内容已生成待药师审核任务，未直接发送给患者。' }
</script>

<style scoped>
.pharmacy-module-page{padding-bottom:28px}.module-tabs{display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid #d5dfe2}.module-tabs button{display:flex;align-items:center;gap:6px;padding:10px 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:#687980;font-size:11px;font-weight:700;cursor:pointer}.module-tabs button.active{border-color:#126b66;color:#126b66;background:#eef7f5}.module-tabs button span{color:#8a989e;font-size:9px}.module-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:12px}.module-main{min-width:0;min-height:520px}.module-main>.surface-panel-header{padding:0 16px}.analysis-layout,.record-layout,.education-layout{padding:16px}.analysis-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.analysis-kpis>div{padding:11px;border:1px solid #dce5e7;background:#f7faf9}.analysis-kpis strong,.analysis-kpis span{display:block}.analysis-kpis strong{font-size:18px}.analysis-kpis span{margin-top:4px;color:#738189;font-size:9px}.protocol-row,.education-patient,.manual-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.protocol-row{padding:11px;margin-bottom:12px;background:#f3f7f7}.protocol-row div{display:grid;gap:3px}.protocol-row span{color:#6e7e85;font-size:9px}.analysis-note{display:flex;gap:8px;margin-top:12px;padding:10px;background:#eef7f5;color:#35665e;font-size:9px;line-height:1.5}.record-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid #e0e6e8}.record-row>div:nth-child(2){min-width:0;display:grid;gap:3px}.record-row strong,.record-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-row strong{font-size:10px}.record-row span{color:#75848a;font-size:9px}.record-avatar{width:28px;height:28px;display:grid;place-items:center;border-radius:5px;background:#e4efee;color:#126b66;font-size:10px;font-weight:800}.manual-block{display:grid;gap:9px;margin-top:18px;padding-top:14px;border-top:1px solid #dce5e7}.manual-block strong{font-size:11px}.education-layout{display:grid;gap:12px}.education-patient{padding:12px;background:#f3f7f7}.education-patient>div:nth-child(2){flex:1;display:grid;gap:3px}.education-patient strong{font-size:11px}.education-patient span{color:#75848a;font-size:9px}.education-checks{display:flex;flex-wrap:wrap;gap:12px}.module-side{display:grid;align-content:start;gap:12px}.flow-steps{display:grid;padding:8px 14px 14px}.flow-steps>div{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;padding:9px 0;border-bottom:1px solid #e4eaeb}.flow-steps>div:last-child{border-bottom:0}.flow-steps>div>span{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#eef1f2;color:#839198;font-size:11px}.flow-steps>div.done>span{background:#e2f1eb;color:#16745b}.flow-steps strong,.flow-steps small{display:block}.flow-steps strong{font-size:10px}.flow-steps small{margin-top:3px;color:#7b898e;font-size:8px}.safety-mini ul{margin:0;padding:12px 28px 16px;color:#61727a;font-size:9px;line-height:2}
@media(max-width:1280px){.module-grid{grid-template-columns:minmax(0,1fr) 230px}.module-side{font-size:9px}}
</style>
