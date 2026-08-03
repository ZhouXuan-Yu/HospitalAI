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
import { computed, ref } from 'vue'
import { ArrowRight, CircleCheck, Download, LockKeyhole, PanelRightOpen, RotateCcw, Search, ShieldCheck } from 'lucide-vue-next'

type AuditEvent={id:string;time:string;domain:string;risk:string;actor:string;role:string;action:string;object:string;result:string;resultClass:string;source:string;ip:string;hash:string;before:string;after:string;prevHash:string;fullHash:string}
const domains=['推荐决策','药师审核','规则治理','证据治理','接口同步','科研与知识']
const events:AuditEvent[]=[
  {id:'AUD-20260803-010284',time:'2026-08-03 10:28:41',domain:'推荐决策',risk:'高',actor:'张医生',role:'DOCTOR · 呼吸内科',action:'修改并采纳候选方案',object:'REC-E001-20260803-v1 · SYN-P001',result:'草稿已创建',resultClass:'',source:'WEB / CORE-API',ip:'10.21.8.42',hash:'已验证',before:'decision=PENDING\ncandidate=CAP-02',after:'decision=MODIFIED\ndraft=DRAFT-10428',prevHash:'43be8b...329f',fullHash:'f829de...a44c'},
  {id:'AUD-20260803-010279',time:'2026-08-03 10:24:18',domain:'接口同步',risk:'常规',actor:'his-adapter-worker',role:'SERVICE_ACCOUNT',action:'导入患者快照',object:'BATCH-20260803-1042 · schema v1',result:'已应用',resultClass:'',source:'HIS_SIMULATOR',ip:'service-network',hash:'已验证',before:'sourceVersion=17',after:'sourceVersion=18\npatients=5',prevHash:'98ae31...5d20',fullHash:'43be8b...329f'},
  {id:'AUD-20260803-010261',time:'2026-08-03 10:17:09',domain:'药师审核',risk:'高',actor:'李药师',role:'PHARMACIST',action:'确认严重不良反应',object:'ADR-0031 · SYN-P003',result:'已阻断',resultClass:'danger',source:'WEB / CORE-API',ip:'10.21.12.17',hash:'已验证',before:'status=PENDING',after:'status=CONFIRMED\nseverity=SEVERE',prevHash:'7ae211...b020',fullHash:'98ae31...5d20'},
  {id:'AUD-20260803-010248',time:'2026-08-03 10:11:32',domain:'规则治理',risk:'高',actor:'王管理员',role:'ADMIN',action:'提交规则版本复核',object:'RULE-ALLERGY-001 · v3.2',result:'待药师复核',resultClass:'warning',source:'WEB / CORE-API',ip:'10.21.2.18',hash:'已验证',before:'status=DRAFT',after:'status=IN_REVIEW',prevHash:'3df801...7b91',fullHash:'7ae211...b020'},
  {id:'AUD-20260803-010221',time:'2026-08-03 09:58:04',domain:'证据治理',risk:'常规',actor:'赵药师',role:'PHARMACIST',action:'发布证据版本',object:'EVD-CAP-DEMO-001 · v1.4',result:'已发布',resultClass:'',source:'WEB / CORE-API',ip:'10.21.12.21',hash:'已验证',before:'status=REVIEWED',after:'status=PUBLISHED',prevHash:'af2091...11ca',fullHash:'3df801...7b91'},
  {id:'AUD-20260803-010199',time:'2026-08-03 09:43:52',domain:'科研与知识',risk:'常规',actor:'陈研究员',role:'RESEARCHER',action:'冻结脱敏队列版本',object:'COHORT-CAP-2026 · v1.0',result:'已冻结',resultClass:'info',source:'WEB / CORE-API',ip:'10.21.16.9',hash:'已验证',before:'status=DRAFT\nrows=1284',after:'status=FROZEN\ninputHash=de31...',prevHash:'000000...0000',fullHash:'af2091...11ca'}]
const query=ref('');const domain=ref('全部');const risk=ref('全部');const range=ref('');const drawer=ref(false);const activeEvent=ref<AuditEvent|null>(null)
const filteredEvents=computed(()=>events.filter(event=>(domain.value==='全部'||event.domain===domain.value)&&(risk.value==='全部'||event.risk===risk.value)&&(!query.value||Object.values(event).join(' ').toLowerCase().includes(query.value.toLowerCase()))))
function reset(){query.value='';domain.value='全部';risk.value='全部';range.value=''}
</script>

<style scoped>
.audit-assurance{display:flex;align-items:center;gap:9px;margin-bottom:10px;padding:10px 12px;border:1px solid #bad8ce;border-radius:5px;background:#edf8f4;color:#245f51}.audit-assurance>div{display:grid;flex:1;gap:2px}.audit-assurance strong{font-size:10px}.audit-assurance span{font-size:8px}.audit-table-panel td strong,.audit-table-panel td small{display:block}.audit-table-panel td small{margin-top:2px;color:#74828a;font-size:7px}.domain-label{font-weight:600;color:#365e6b}.integrity{display:flex;align-items:center;gap:4px;color:#267058;font-size:8px}.event-detail-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #dce4e7}.event-detail-head code{font-size:9px}.detail-list{margin:0 0 18px}.detail-list div{display:grid;grid-template-columns:110px 1fr;padding:8px 0;border-bottom:1px solid #edf1f2}.detail-list dt{color:#718088;font-size:9px}.detail-list dd{margin:0;font-size:9px}.event-detail-head~h3{margin:18px 0 8px;font-size:10px}.state-diff{display:grid;grid-template-columns:1fr 22px 1fr;align-items:center;gap:7px}.state-diff>div{min-width:0}.state-diff span,.hash-box span{display:block;margin-bottom:4px;color:#718088;font-size:8px}.state-diff pre{min-height:70px;margin:0;padding:9px;border:1px solid #dce4e7;background:#f6f8f9;white-space:pre-wrap;font-size:8px}.hash-box{display:grid;gap:4px;padding:10px;background:#14272b;color:#d7ece8}.hash-box span{margin-top:3px;color:#8fb2ad}.hash-box code{overflow-wrap:anywhere;font-size:8px}
</style>
