<template>
  <div class="product-page timeline-page">
    <header class="page-heading"><div><h1>长期用药追踪</h1><p>按就诊分段展示用药、检验、症状、不良反应、医生调整和结局并行轨道。</p></div><div class="page-heading-actions"><el-button :icon="Filter">筛选轨道</el-button><el-button :icon="MessageSquarePlus">记录用药反馈</el-button><el-button type="primary" :icon="Stethoscope" @click="router.push('/doctor/workbench/E001')">返回当前决策</el-button></div></header>
    <section class="timeline-patient-bar surface-panel"><div><strong>{{ timeline?.displayName || '加载中' }}</strong><span>{{ timeline?.detail }}</span></div><div class="timeline-legend"><span v-for="item in legends" :key="item.label"><i :style="{ background: item.color }"></i>{{ item.label }}</span></div><el-select v-model="range" size="small"><el-option label="近 2 年" value="2y" /><el-option label="全部记录" value="all" /></el-select></section>
    <section class="longitudinal surface-panel">
      <div class="encounter-segment current"><div class="encounter-header"><div><span class="encounter-date">{{ timeline?.current.date }}</span><h2>{{ timeline?.current.title }}</h2><p>{{ timeline?.current.diagnosis }}</p></div><div class="encounter-state"><span class="status-pill" :class="timeline?.current.statusClass"><span class="dot"></span>{{ timeline?.current.statusLabel }}</span><strong>{{ timeline?.current.daysText }}</strong></div></div><div class="tracks"><div v-for="track in currentTracks" :key="track.name" class="track-row"><div class="track-label"><component :is="track.icon" :size="15" />{{ track.name }}</div><div class="track-lane"><article v-for="event in track.events" :key="event.time + event.title" :class="track.trackClass"><time>{{ event.time }}</time><strong>{{ event.title }}</strong><span>{{ event.detail }}</span><small>{{ event.source }}</small></article></div></div></div></div>
      <div class="risk-link"><ShieldAlert :size="17" /><div><strong>{{ timeline?.riskLink.title }}</strong><span>{{ timeline?.riskLink.text }}</span></div><el-button size="small" @click="router.push('/doctor/workbench/E001')">查看关联推荐</el-button></div>
      <div v-for="encounter in historicalEncounters" :key="encounter.id" class="encounter-segment"><div class="encounter-header"><div><span class="encounter-date">{{ encounter.date }}</span><h2>{{ encounter.title }}</h2><p>{{ encounter.diagnosis }}</p></div><div class="encounter-state"><span class="status-pill"><span class="dot"></span>{{ encounter.outcome }}</span><strong>{{ encounter.duration }}</strong></div></div><div class="compact-event-grid"><article v-for="event in encounter.events" :key="event.title" :class="event.className"><div><component :is="event.icon" :size="15" /><span>{{ event.type }}</span></div><strong>{{ event.title }}</strong><p>{{ event.detail }}</p><small>{{ event.source }}</small></article></div></div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Activity, ClipboardPlus, FileCheck2, Filter, FlaskConical, MessageSquarePlus, Pill, ShieldAlert, Stethoscope, Thermometer } from 'lucide-vue-next'
import { loadTimeline } from '../services/dataAccess'
import type { TimelinePayload } from '../services/dataAccess'

const route = useRoute()
const router = useRouter()
const range = ref('2y')
const timeline = ref<TimelinePayload | null>(null)
const patientId = computed(() => String(route.params.patientId || 'P001'))

const legendIcons = { pill: Pill, activity: Activity, 'file-check-2': FileCheck2, 'message-square-plus': MessageSquarePlus, thermometer: Thermometer }
const trackIcons = { 用药: Pill, 检验: FlaskConical, 症状: Thermometer, 调整: ClipboardPlus }
const currentTracks = computed(() => timeline.value?.current.tracks.map(track => ({ ...track, icon: trackIcons[track.name as keyof typeof trackIcons] })) ?? [])
const legends = computed(() => timeline.value?.legends ?? [])
const historicalEncounters = computed(() => timeline.value?.historical.map(encounter => ({
  ...encounter,
  events: encounter.events.map(event => ({ ...event, icon: legendIcons[event.icon as keyof typeof legendIcons] ?? FileCheck2 }))
})) ?? [])

onMounted(async () => {
  timeline.value = await loadTimeline(patientId.value)
})
</script>
<style scoped>
.timeline-patient-bar{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px;margin-bottom:14px;padding:11px 14px}.timeline-patient-bar>div:first-child{display:grid;gap:2px}.timeline-patient-bar strong{font-size:11px}.timeline-patient-bar span{color:#687880;font-size:9px}.timeline-legend{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}.timeline-legend span{display:inline-flex;align-items:center;gap:5px}.timeline-legend i{width:7px;height:7px;border-radius:2px}.longitudinal{padding:16px}.encounter-segment{padding:0 0 20px;margin-bottom:20px;border-bottom:1px solid #d9e2e5}.encounter-segment:last-child{border-bottom:none;margin-bottom:0}.encounter-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:12px}.encounter-date{color:#126b66;font-size:9px;font-weight:750}.encounter-header h2{margin:3px 0;font-size:14px}.encounter-header p{margin:0;color:#697981;font-size:9px}.encounter-state{display:grid;justify-items:end;gap:5px}.encounter-state>strong{font-size:9px}.tracks{display:grid;border:1px solid #d9e2e5;border-radius:5px;overflow:hidden}.track-row{display:grid;grid-template-columns:84px minmax(0,1fr);border-bottom:1px solid #dfe6e9}.track-row:last-child{border-bottom:none}.track-label{display:flex;align-items:flex-start;gap:6px;padding:11px 9px;background:#f4f7f8;color:#52656f;font-size:9px;font-weight:700}.track-lane{min-width:0;display:flex;gap:8px;padding:8px;overflow-x:auto}.track-lane article,.compact-event-grid article{min-width:185px;padding:8px 9px;border:1px solid #d8e1e4;border-left:3px solid #65747c;border-radius:4px;background:#fff}.track-lane time{display:block;color:#718088;font-size:8px}.track-lane strong,.compact-event-grid strong{display:block;margin-top:3px;font-size:10px}.track-lane span{display:block;margin-top:2px;color:#53666f;font-size:8px}.track-lane small,.compact-event-grid small{display:block;margin-top:5px;color:#7c8990;font-size:7px}.med-event{border-left-color:#2f7f79!important}.lab-event{border-left-color:#3974a3!important}.symptom-event{border-left-color:#9c631b!important}.adjust-event{border-left-color:#65747c!important}.risk-link{display:flex;align-items:center;gap:9px;margin:-7px 0 20px;padding:10px;border:1px solid #ebd2aa;border-radius:5px;background:#fff7e9;color:#825018}.risk-link>div{min-width:0;flex:1;display:grid;gap:2px}.risk-link strong{font-size:10px}.risk-link span{font-size:8px;line-height:1.45}.compact-event-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.compact-event-grid article{min-width:0}.compact-event-grid article>div{display:flex;align-items:center;gap:5px;color:#65757d;font-size:8px}.compact-event-grid p{margin:4px 0 0;color:#53666f;font-size:8px;line-height:1.45}@media(max-width:1350px){.compact-event-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
