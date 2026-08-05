<template>
  <div class="product-page">
    <header class="page-heading">
      <div><h1>审计日志</h1><p>追踪患者事实、规则执行、推荐决策、审核发布与接口回写的完整责任链。</p></div>
      <div class="page-heading-actions"><el-button :icon="ShieldCheck">完整性校验</el-button><el-button type="primary" :icon="Download">导出审计包</el-button></div>
    </header>

    <div class="audit-assurance"><LockKeyhole :size="18"/><div><strong>追加写入 · 不可由管理员删除</strong><span>事件正文、前序哈希与操作者身份共同形成可验证链；导出不会包含超出当前角色权限的患者身份字段。</span></div><span class="status-pill"><span class="dot"></span>链完整</span></div>

    <section class="summary-strip">
      <div><span>今日事件</span><strong>1,284</strong><small>业务操作 1,196</small></div>
      <div><span>高风险操作</span><strong class="danger-text">7</strong><small>均已关联审核记录</small></div>
      <div><span>接口失败</span><strong class="warning-text">3</strong><small>进入可靠任务重试</small></div>
      <div><span>完整性校验</span><strong>100%</strong><small>最后校验 10:30</small></div>
    </section>

    <div class="toolbar-row">
      <el-input v-model="query" :prefix-icon="Search" placeholder="患者标识、事件 ID、操作者或对象" clearable/>
      <el-select v-model="domain" aria-label="业务域"><el-option label="全部业务域" value="全部"/><el-option v-for="item in domains" :key="item" :label="item" :value="item"/></el-select>
      <el-select v-model="risk" aria-label="风险等级"><el-option label="全部风险" value="全部"/><el-option label="高风险" value="高"/><el-option label="常规" value="常规"/></el-select>
      <el-date-picker v-model="range" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"/>
      <el-button :icon="RotateCcw" @click="reset">重置</el-button>
    </div>

    <section class="surface-panel audit-table-panel">
      <div class="surface-panel-header"><h2>事件流水</h2><span>显示 {{ filteredEvents.length }} 条预览事件 · 时间为 Asia/Shanghai</span></div>
      <table class="dense-table">
        <thead><tr><th>时间 / 事件 ID</th><th>业务域</th><th>操作者</th><th>操作与对象</th><th>结果</th><th>来源</th><th>完整性</th><th></th></tr></thead>
        <tbody><tr v-for="event in filteredEvents" :key="event.id">
          <td><strong>{{ event.time }}</strong><small>{{ event.id }}</small></td><td><span class="domain-label">{{ event.domain }}</span></td>
          <td><strong>{{ event.actor }}</strong><small>{{ event.role }}</small></td><td><strong>{{ event.action }}</strong><small>{{ event.object }}</small></td>
          <td><span class="status-pill" :class="event.resultClass"><span class="dot"></span>{{ event.result }}</span></td><td><span>{{ event.source }}</span><small>{{ event.ip }}</small></td>
          <td><span class="integrity"><CircleCheck :size="14"/>{{ event.hash }}</span></td><td><el-button :icon="PanelRightOpen" circle plain size="small" title="查看事件详情" @click="activeEvent=event;drawer=true"/></td>
        </tr></tbody>
      </table>
    </section>

    <el-drawer v-model="drawer" title="审计事件详情" size="480px">
      <template v-if="activeEvent"><div class="event-detail-head"><span class="status-pill" :class="activeEvent.resultClass"><span class="dot"></span>{{ activeEvent.result }}</span><code>{{ activeEvent.id }}</code></div>
      <dl class="detail-list"><div><dt>操作者</dt><dd>{{ activeEvent.actor }} · {{ activeEvent.role }}</dd></div><div><dt>业务动作</dt><dd>{{ activeEvent.action }}</dd></div><div><dt>业务对象</dt><dd>{{ activeEvent.object }}</dd></div><div><dt>请求来源</dt><dd>{{ activeEvent.source }} · {{ activeEvent.ip }}</dd></div><div><dt>发生时间</dt><dd>{{ activeEvent.time }} Asia/Shanghai</dd></div></dl>
      <h3>状态变更</h3><div class="state-diff"><div><span>变更前</span><pre>{{ activeEvent.before }}</pre></div><ArrowRight :size="18"/><div><span>变更后</span><pre>{{ activeEvent.after }}</pre></div></div>
      <h3>链式完整性</h3><div class="hash-box"><span>PREV SHA-256</span><code>{{ activeEvent.prevHash }}</code><span>EVENT SHA-256</span><code>{{ activeEvent.fullHash }}</code></div></template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, CircleCheck, Download, LockKeyhole, PanelRightOpen, RotateCcw, Search, ShieldCheck } from 'lucide-vue-next'
import { mockFetchAuditEvents, mockFetchAuditDomains } from '../services/mockApi'
import type { AuditEventItem } from '../services/mockApi'

type AuditEvent = AuditEventItem
const domains = ref<string[]>([])
const events = ref<AuditEvent[]>([])
const query=ref('');const domain=ref('全部');const risk=ref('全部');const range=ref('');const drawer=ref(false);const activeEvent=ref<AuditEvent|null>(null)

onMounted(async () => {
  const [d, e] = await Promise.all([mockFetchAuditDomains(), mockFetchAuditEvents()])
  domains.value = d
  events.value = e
})

const filteredEvents=computed(()=>events.value.filter(event=>(domain.value==='全部'||event.domain===domain.value)&&(risk.value==='全部'||event.risk===risk.value)&&(!query.value||Object.values(event).join(' ').toLowerCase().includes(query.value.toLowerCase()))))
function reset(){query.value='';domain.value='全部';risk.value='全部';range.value=''}
</script>

<style scoped>
.audit-assurance{display:flex;align-items:center;gap:9px;margin-bottom:10px;padding:10px 12px;border:1px solid #bad8ce;border-radius:5px;background:#edf8f4;color:#245f51}.audit-assurance>div{display:grid;flex:1;gap:2px}.audit-assurance strong{font-size:10px}.audit-assurance span{font-size:8px}.audit-table-panel td strong,.audit-table-panel td small{display:block}.audit-table-panel td small{margin-top:2px;color:#74828a;font-size:7px}.domain-label{font-weight:600;color:#365e6b}.integrity{display:flex;align-items:center;gap:4px;color:#267058;font-size:8px}.event-detail-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #dce4e7}.event-detail-head code{font-size:9px}.detail-list{margin:0 0 18px}.detail-list div{display:grid;grid-template-columns:110px 1fr;padding:8px 0;border-bottom:1px solid #edf1f2}.detail-list dt{color:#718088;font-size:9px}.detail-list dd{margin:0;font-size:9px}.event-detail-head~h3{margin:18px 0 8px;font-size:10px}.state-diff{display:grid;grid-template-columns:1fr 22px 1fr;align-items:center;gap:7px}.state-diff>div{min-width:0}.state-diff span,.hash-box span{display:block;margin-bottom:4px;color:#718088;font-size:8px}.state-diff pre{min-height:70px;margin:0;padding:9px;border:1px solid #dce4e7;background:#f6f8f9;white-space:pre-wrap;font-size:8px}.hash-box{display:grid;gap:4px;padding:10px;background:#14272b;color:#d7ece8}.hash-box span{margin-top:3px;color:#8fb2ad}.hash-box code{overflow-wrap:anywhere;font-size:8px}
</style>
