<template>
  <div class="product-page">
    <header class="page-heading">
      <div><h1>患者用药全景</h1><p>按对当前处方决策的影响排序，原始事实、规则结果与辅助摘要分层展示。</p></div>
      <div class="page-heading-actions"><el-button :icon="History" @click="$router.push('/doctor/timeline/P001')">长期时间线</el-button><el-button type="primary" :icon="Stethoscope" @click="$router.push('/doctor/workbench/E001')">进入处方决策</el-button></div>
    </header>

    <section class="patient-banner surface-panel">
      <div class="patient-banner-main"><div class="overview-avatar">A</div><div><div class="overview-name"><h2>合成患者A</h2><el-tag size="small" effect="plain">合成模拟数据</el-tag></div><p>女 · 66岁 · HIS-P001 · 呼吸内科 E001 · 数据版本 v3</p></div></div>
      <div class="patient-banner-safety"><div><span>确认过敏</span><strong class="clear-text">未记录</strong></div><div><span>严重 ADR</span><strong class="clear-text">未记录</strong></div><div><span>特殊人群</span><strong>老年患者</strong></div><div><span>当前阻断</span><strong class="clear-text">0 项</strong></div></div>
    </section>

    <div class="overview-grid">
      <div class="overview-main">
        <section class="surface-panel overview-section"><div class="surface-panel-header"><h2>当前就诊与诊断</h2><el-tag size="small" type="success" effect="plain">当前有效</el-tag></div><div class="surface-panel-body"><div class="primary-diagnosis"><Stethoscope :size="20" /><div><strong>社区获得性肺炎</strong><span>HIS 诊断 · active · 2026-08-03 08:20</span></div></div><div class="participation-row"><span>主管科室</span><strong>呼吸内科</strong><span>参与科室</span><strong>无新增会诊</strong><span>住院第</span><strong>1 天</strong></div></div></section>
        <section class="surface-panel overview-section"><div class="surface-panel-header"><h2>关键检验与趋势</h2><span>影响剂量与风险判断</span></div><div class="lab-grid"><article v-for="lab in labs" :key="lab.name"><div><span>{{ lab.name }}</span><el-tag size="small" :type="lab.flag ? 'warning' : 'info'" effect="plain">{{ lab.flag || '最新' }}</el-tag></div><strong>{{ lab.value }} <small>{{ lab.unit }}</small></strong><div class="spark-bars"><i v-for="(bar, index) in lab.trend" :key="index" :style="{ height: `${bar}%` }"></i></div><p>{{ lab.note }} · LIS · 08:50</p></article></div></section>
        <section class="surface-panel overview-section"><div class="surface-panel-header"><h2>当前与近期用药</h2><span>计划、医嘱与实际暴露分层</span></div><table class="dense-table"><thead><tr><th>药品</th><th>状态</th><th>科室</th><th>给药信息</th><th>起止时间</th><th>来源</th></tr></thead><tbody><tr v-for="drug in medications" :key="drug.name"><td><strong>{{ drug.name }}</strong><small class="row-note">{{ drug.code }}</small></td><td><span class="status-pill" :class="drug.statusClass"><span class="dot"></span>{{ drug.status }}</span></td><td>{{ drug.department }}</td><td>{{ drug.route }}</td><td>{{ drug.time }}</td><td><button class="record-link">{{ drug.source }} <ExternalLink :size="11" /></button></td></tr></tbody></table></section>
      </div>
      <aside class="overview-side">
        <section class="surface-panel overview-section"><div class="surface-panel-header"><h2>跨就诊安全摘要</h2><span>全院范围</span></div><div class="surface-panel-body safety-history"><div class="safety-clear"><ShieldCheck :size="18" /><div><strong>未发现确认过敏或严重 ADR</strong><span>已核对 3 次历史就诊记录</span></div></div><div v-for="item in history" :key="item.title" class="history-item"><span>{{ item.date }}</span><div><strong>{{ item.title }}</strong><p>{{ item.text }}</p><small>{{ item.source }}</small></div></div></div></section>
        <section class="surface-panel overview-section"><div class="surface-panel-header"><h2>数据质量</h2><span>提交前复核</span></div><div class="surface-panel-body quality-summary"><div><CircleCheck :size="16" /><span>患者身份映射一致</span></div><div><CircleCheck :size="16" /><span>关键检验未缺失</span></div><div><CircleCheck :size="16" /><span>当前用药来源可追溯</span></div><button>查看全部原始事实与来源 <ChevronRight :size="14" /></button></div></section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronRight, CircleCheck, ExternalLink, History, ShieldCheck, Stethoscope } from 'lucide-vue-next'
import { mockFetchPatientContext } from '../services/mockApi'
import type { PatientContextPayload } from '../services/mockApi'

const route = useRoute()
const patient = ref<PatientContextPayload | null>(null)
const patientId = computed(() => String(route.params.patientId || 'P001'))

function goTimeline() { window.$router?.push(`/doctor/timeline/${patientId.value}`) }

onMounted(async () => {
  patient.value = await mockFetchPatientContext(patientId.value)
})
</script>

<style scoped>
.patient-banner { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 14px; padding: 15px; }
.patient-banner-main { display: flex; align-items: center; gap: 11px; }
.overview-avatar { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 6px; background: #e5efee; color: #125f5b; font-size: 18px; font-weight: 800; }
.overview-name { display: flex; align-items: center; gap: 8px; }
.overview-name h2 { margin: 0; font-size: 17px; }
.patient-banner-main p { margin: 4px 0 0; color: #65757d; font-size: 10px; }
.patient-banner-safety { display: grid; grid-template-columns: repeat(4, minmax(90px, 1fr)); gap: 0; }
.patient-banner-safety > div { min-width: 0; display: grid; gap: 3px; padding: 2px 14px; border-left: 1px solid #dce4e7; }
.patient-banner-safety span { color: #718088; font-size: 8px; }
.patient-banner-safety strong { font-size: 10px; }
.clear-text { color: #286c54; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 68%) minmax(300px, 32%); gap: 14px; }
.overview-main, .overview-side { min-width: 0; display: grid; align-content: start; gap: 14px; }
.overview-section { overflow: hidden; }
.primary-diagnosis { display: flex; align-items: flex-start; gap: 9px; padding: 10px; border-left: 3px solid #126b66; background: #edf5f4; }
.primary-diagnosis > div { display: grid; gap: 3px; }
.primary-diagnosis strong { font-size: 12px; }
.primary-diagnosis span { color: #64757d; font-size: 9px; }
.participation-row { display: grid; grid-template-columns: auto 1fr auto 1fr auto auto; gap: 8px; margin-top: 12px; color: #61717a; font-size: 9px; }
.participation-row strong { color: #283b44; }
.lab-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.lab-grid article { min-width: 0; padding: 12px; border-right: 1px solid #dce4e7; }
.lab-grid article:last-child { border-right: none; }
.lab-grid article > div:first-child { display: flex; align-items: center; justify-content: space-between; gap: 5px; color: #62737b; font-size: 9px; }
.lab-grid strong { display: block; margin-top: 7px; font-size: 18px; }
.lab-grid strong small { font-size: 8px; font-weight: 500; }
.spark-bars { height: 30px; display: flex; align-items: end; gap: 3px; margin-top: 7px; }
.spark-bars i { width: 8px; min-height: 4px; border-radius: 2px 2px 0 0; background: #78aaa5; }
.lab-grid p { margin: 6px 0 0; color: #73828a; font-size: 8px; }
.row-note { display: block; margin-top: 2px; color: #75838a; font-size: 8px; }
.record-link { display: inline-flex; align-items: center; gap: 3px; padding: 0; border: none; background: transparent; color: #286a88; font-size: 9px; cursor: pointer; }
.safety-history { display: grid; gap: 12px; }
.safety-clear { display: flex; gap: 8px; padding: 10px; background: #edf7f2; color: #286c54; }
.safety-clear > div { display: grid; gap: 2px; }
.safety-clear strong { font-size: 10px; }
.safety-clear span { font-size: 8px; }
.history-item { display: grid; grid-template-columns: 50px minmax(0, 1fr); gap: 9px; }
.history-item > span { color: #6d7c84; font-size: 9px; }
.history-item > div { padding-left: 9px; border-left: 2px solid #c7d4d8; }
.history-item strong { font-size: 10px; }
.history-item p { margin: 4px 0; color: #53666f; font-size: 9px; line-height: 1.5; }
.history-item small { color: #78868d; font-size: 8px; }
.quality-summary { display: grid; gap: 8px; }
.quality-summary > div { display: flex; align-items: center; gap: 7px; color: #3f6559; font-size: 9px; }
.quality-summary button { display: flex; align-items: center; justify-content: space-between; margin-top: 5px; padding: 8px; border: 1px solid #d9e2e5; border-radius: 4px; background: #f7f9fa; color: #526771; font-size: 9px; cursor: pointer; }
@media(max-width:1450px){.patient-banner{align-items:flex-start}.patient-banner-safety{grid-template-columns:repeat(2,1fr);gap:8px}.overview-grid{grid-template-columns:minmax(0,64%) minmax(290px,36%)}.lab-grid{grid-template-columns:repeat(2,1fr)}.lab-grid article:nth-child(2){border-right:none}.lab-grid article:nth-child(-n+2){border-bottom:1px solid #dce4e7}}
</style>
