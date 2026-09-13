<template>
  <div class="research-page" data-testid="research-workbench">
    <header class="research-header">
      <div>
        <div class="eyebrow">科研与真实世界证据</div>
        <h1>医学科研工作台</h1>
        <p>药师主导的药物比较研究，从研究问题到可复现成果包。</p>
      </div>
      <div class="header-actions">
        <el-tag type="warning" effect="plain">合成数据演示</el-tag>
        <el-button :icon="Upload" @click="fileInput?.click()">导入科研 JSON</el-button>
        <el-button type="primary" :icon="DatabaseZap" :loading="importing" @click="loadBuiltInDataset">导入内置模拟数据</el-button>
        <el-button :icon="Trash2" @click="clearDemoData">清除数据</el-button>
        <input ref="fileInput" class="file-input" type="file" accept="application/json,.json" @change="importFile">
      </div>
    </header>

    <el-alert
      title="当前研究使用合成模拟数据，仅用于验证产品流程、接口契约和统计展示，不构成医学证据或论文结论。"
      type="warning"
      :closable="false"
      show-icon
    />
    <el-alert v-if="actionError" class="action-alert" type="error" :title="actionError" :closable="false" show-icon />

    <section v-if="seed" class="project-strip" aria-label="当前研究项目">
      <div class="project-main">
        <span>当前项目</span>
        <strong>{{ seed.project.title }}</strong>
        <small>{{ seed.project.projectId }} · {{ seed.project.protocolVersion }}</small>
      </div>
      <div><span>数据来源</span><strong>{{ flow.researchSourceName || seed.project.dataSource || '前端场景数据' }}</strong><small>{{ flow.researchRecords.length.toLocaleString() }} 条候选记录</small></div>
      <div><span>数据集</span><strong>{{ flow.datasetVersion || '尚未冻结' }}</strong><small>{{ flow.datasetHash || '质控通过后生成内容哈希' }}</small></div>
      <div><span>当前状态</span><strong>{{ currentStatus }}</strong><small>上游变更将使下游成果失效</small></div>
    </section>

    <nav class="stage-nav" aria-label="科研流程">
      <button v-for="(stage, index) in stages" :key="stage.key" :class="{ active: activeStage === stage.key, done: stage.done }" @click="activeStage = stage.key">
        <span class="stage-index"><CircleCheck v-if="stage.done" :size="17" /><template v-else>{{ index + 1 }}</template></span>
        <span><strong>{{ stage.label }}</strong><small>{{ stage.meta }}</small></span>
      </button>
    </nav>

    <section v-if="!seed" class="empty-import">
      <FileJson2 :size="38" />
      <h2>尚未导入科研数据</h2>
      <p>导入符合 <code>hospitalai.research-dataset.v1</code> 的 JSON 文件，或载入内置的 2,000 例合成房颤队列。</p>
      <el-button type="primary" :icon="DatabaseZap" :loading="importing" @click="loadBuiltInDataset">导入内置模拟数据</el-button>
    </section>

    <main v-else class="stage-workspace">
      <section v-if="activeStage === 'topic'" class="two-column topic-layout">
        <article class="work-panel">
          <div class="panel-heading"><div><span>研究协议</span><h2>明确研究问题与分析边界</h2></div><el-tag :type="flow.protocolSaved ? 'success' : 'info'">{{ flow.protocolSaved ? '协议已锁定' : '草稿' }}</el-tag></div>
          <el-form label-position="top" class="protocol-form">
            <el-form-item label="研究问题"><el-input v-model="protocolForm.researchQuestion" type="textarea" :rows="3" /></el-form-item>
            <div class="form-grid"><el-form-item label="研究设计"><el-input v-model="protocolForm.design" type="textarea" :rows="3" /></el-form-item><el-form-item label="观察窗口"><el-input v-model="protocolForm.observationWindow" type="textarea" :rows="3" /></el-form-item></div>
            <el-form-item label="伦理与数据边界"><el-input v-model="protocolForm.ethicsStatus" type="textarea" :rows="2" /></el-form-item>
            <el-button type="primary" :icon="Save" :disabled="!protocolComplete" @click="saveProtocol">保存协议并进入数据准备</el-button>
          </el-form>
        </article>
        <aside class="work-panel protocol-aside">
          <div class="panel-heading"><div><span>PICO 与研究口径</span><h2>立项摘要</h2></div></div>
          <dl class="definition-list"><div><dt>研究人群</dt><dd>65 岁及以上非瓣膜性房颤患者</dd></div><div><dt>暴露组</dt><dd>阿哌沙班新使用者</dd></div><div><dt>对照组</dt><dd>利伐沙班新使用者</dd></div><div><dt>主要结局</dt><dd>{{ seed.publicationProfile.primaryEndpoint }}</dd></div><div><dt>报告规范</dt><dd>{{ seed.publicationProfile.reportingGuideline }}</dd></div></dl>
          <div class="criteria"><h3>纳入标准</h3><p v-for="item in seed.project.inclusionCriteria" :key="item"><Check :size="14" />{{ item }}</p><h3>排除标准</h3><p v-for="item in seed.project.exclusionCriteria" :key="item"><Minus :size="14" />{{ item }}</p></div>
        </aside>
      </section>

      <section v-else-if="activeStage === 'data'" class="data-stage">
        <div class="metrics-row">
          <div><span>候选记录</span><strong>{{ flow.researchRecords.length.toLocaleString() }}</strong><small>导入批次总量</small></div>
          <div><span>符合纳排</span><strong>{{ flow.cohortBuilt ? flow.cohortRecordIds.length.toLocaleString() : '-' }}</strong><small>年龄、诊断、暴露与随访</small></div>
          <div><span>变量</span><strong>{{ seed.variables.length }}</strong><small>暴露、结局与混杂因素</small></div>
          <div><span>质量问题</span><strong>{{ flow.unresolvedQualityIssues.length }}</strong><small>{{ blockingIssueCount }} 项阻断</small></div>
        </div>

        <article class="work-panel pipeline-panel">
          <div class="panel-heading"><div><span>数据准备流水线</span><h2>导入、纳排、变量确认与冻结</h2></div><small>每一步都记录版本、来源与审计事件</small></div>
          <div class="pipeline-actions">
            <button :class="{ complete: flow.researchRecords.length > 0 }"><FileInput :size="18" /><span><strong>1. 数据导入</strong><small>{{ flow.researchSourceName || '等待外部数据' }}</small></span></button>
            <button :class="{ complete: flow.cohortBuilt }" :disabled="!flow.protocolSaved" @click="buildCohort"><Filter :size="18" /><span><strong>2. 执行纳排</strong><small>{{ flow.cohortBuilt ? `纳入 ${flow.cohortRecordIds.length} 条` : '按协议筛选队列' }}</small></span></button>
            <button :class="{ complete: flow.variablesConfirmed }" :disabled="!flow.cohortBuilt" @click="confirmVariables"><ListChecks :size="18" /><span><strong>3. 确认变量</strong><small>{{ flow.variablesConfirmed ? '变量口径已确认' : '核对来源与缺失策略' }}</small></span></button>
            <button :class="{ complete: Boolean(flow.datasetVersion) }" :disabled="!canFreeze" @click="freezeDataset"><Snowflake :size="18" /><span><strong>4. 冻结数据集</strong><small>{{ flow.datasetVersion || '处理阻断问题后可冻结' }}</small></span></button>
          </div>
        </article>

        <div class="two-column data-detail">
          <article class="work-panel">
            <div class="panel-heading"><div><span>队列预览</span><h2>标准化研究记录</h2></div><small>显示前 8 条，共 {{ flow.researchRecords.length.toLocaleString() }} 条</small></div>
            <div class="table-scroll"><table class="research-table"><thead><tr><th>研究对象</th><th>年龄/性别</th><th>暴露方案</th><th>随访</th><th>卒中/栓塞</th><th>大出血</th><th>肾功能</th></tr></thead><tbody><tr v-for="record in visibleRecords" :key="record.recordId"><td><strong>{{ record.patientId }}</strong><small>{{ record.recordId }}</small></td><td>{{ record.age }} / {{ record.sex === 'F' ? '女' : '男' }}</td><td><b>{{ record.regimen }}</b></td><td>{{ record.followupDays ?? '-' }} 天</td><td><span :class="['event-value', { yes: record.ischemicStroke }]">{{ record.ischemicStroke ? '发生' : '未发生' }}</span></td><td><span :class="['event-value', { yes: record.majorBleeding }]">{{ record.majorBleeding ? '发生' : '未发生' }}</span></td><td>{{ record.egfr ?? '缺失' }}</td></tr></tbody></table></div>
          </article>
          <aside class="work-panel">
            <div class="panel-heading"><div><span>质量控制</span><h2>待处理问题</h2></div><small>阻断问题必须形成处理记录</small></div>
            <div class="issue-list"><article v-for="issue in seed.qualityIssues" :key="issue.issueId" :class="{ resolved: flow.resolvedQualityIssues.includes(issue.issueId) }"><header><el-tag size="small" :type="issue.severity === 'blocking' ? 'danger' : 'warning'">{{ issue.severity === 'blocking' ? '阻断' : '警告' }}</el-tag><code>{{ issue.issueId }}</code></header><strong>{{ issue.title }}</strong><p>{{ issue.field }} · 影响 {{ issue.affectedRecords }} 条</p><small>{{ issue.resolution }}</small><el-button size="small" plain :disabled="flow.resolvedQualityIssues.includes(issue.issueId)" @click="resolveIssue(issue.issueId)">{{ flow.resolvedQualityIssues.includes(issue.issueId) ? '已记录处理' : '记录处理结果' }}</el-button></article></div>
          </aside>
        </div>
      </section>

      <section v-else-if="activeStage === 'analysis'" class="analysis-stage">
        <div class="two-column analysis-top">
          <article class="work-panel">
            <div class="panel-heading"><div><span>统计分析计划</span><h2>{{ seed.analysisPlan.method }}</h2></div><el-tag type="success" effect="plain">方法已固定</el-tag></div>
            <div class="method-flow"><span>SMD</span><ChevronRight :size="15" /><span>PS-IPTW</span><ChevronRight :size="15" /><span>KM / Log-rank</span><ChevronRight :size="15" /><span>Cox</span><ChevronRight :size="15" /><span>亚组与敏感性</span></div>
            <p class="method-meta">脚本 {{ seed.analysisPlan.scriptName }} v{{ seed.analysisPlan.scriptVersion }} · 输入 {{ flow.datasetHash || '等待冻结数据集' }}</p>
            <el-button type="primary" :icon="Play" :loading="flow.analysisStatus === 'running'" :disabled="!flow.datasetVersion" @click="runAnalysis">运行固定版本统计</el-button>
          </article>
          <aside class="work-panel"><div class="panel-heading"><div><span>预定义输出</span><h2>论文支撑材料</h2></div></div><ul class="output-list"><li v-for="item in seed.analysisPlan.outputs" :key="item"><CheckCircle2 :size="16" />{{ item }}</li></ul></aside>
        </div>
        <article v-if="flow.analysisResult" class="work-panel result-panel">
          <div class="panel-heading"><div><span>分析运行 {{ flow.analysisResult.runId }}</span><h2>主要结局比较</h2></div><el-tag type="warning">合成结果</el-tag></div>
          <div class="table-scroll"><table class="research-table outcome-table"><thead><tr><th>暴露方案</th><th>样本量</th><th>卒中/栓塞</th><th>大出血</th><th>死亡</th><th>再入院</th><th>中位随访</th></tr></thead><tbody><tr v-for="item in flow.analysisResult.comparativeOutcomes" :key="item.regimen"><td><strong>{{ item.regimen }}</strong></td><td>{{ item.sampleSize }}</td><td>{{ item.strokeCount }}（{{ item.strokeRate }}%）</td><td>{{ item.majorBleedingCount }}（{{ item.majorBleedingRate }}%）</td><td>{{ item.deathCount }}</td><td>{{ item.readmissionCount }}</td><td>{{ item.medianFollowupDays }} 天</td></tr></tbody></table></div>
          <div class="effect-grid"><article v-for="effect in flow.analysisResult.effectEstimates" :key="effect.outcome"><span>{{ effect.outcome }}</span><strong>{{ effect.measure }} {{ effect.estimate.toFixed(2) }}</strong><p>95% CI {{ effect.lower95 }}–{{ effect.upper95 }} · P={{ effect.pValue }}</p><small>演示估计值，不得作临床解释</small></article></div>
          <footer class="hash-line">输出哈希 <code>{{ flow.analysisResult.outputHash }}</code></footer>
        </article>
        <section v-else class="empty-result"><BarChart3 :size="34" /><h2>等待统计运行</h2><p>冻结数据集后运行固定 Python 分析计划，结果将与输入哈希和脚本版本绑定。</p></section>
      </section>

      <section v-else-if="activeStage === 'report'" class="report-stage two-column">
        <aside class="work-panel report-nav">
          <div class="panel-heading"><div><span>报告结构</span><h2>{{ flow.reportVersion || '尚未生成' }}</h2></div></div>
          <button v-for="section in reportSections" :key="section.key" :class="{ active: reportSection === section.key }" @click="reportSection = section.key"><FileText :size="15" /><span>{{ section.label }}</span><Check v-if="flow.reportSections[section.key]" :size="14" /></button>
          <el-button type="primary" :icon="FilePlus2" :disabled="!flow.analysisResult" @click="generateReport">{{ flow.reportStatus === 'not_started' ? '生成报告草稿' : '重新生成草稿' }}</el-button>
        </aside>
        <article class="work-panel report-editor">
          <div class="panel-heading"><div><span>可审核报告草稿</span><h2>{{ currentReportLabel }}</h2></div><el-tag :type="flow.reportStatus === 'approved_frozen' ? 'success' : 'warning'">{{ reportStatusLabel }}</el-tag></div>
          <div v-if="flow.reportStatus !== 'not_started'">
            <el-input v-model="flow.reportSections[reportSection]" type="textarea" :rows="15" @change="flow.persist()" />
            <div class="review-flow">
              <div v-for="review in reviewStages" :key="review.role" :class="{ complete: flow.reviewApprovals.includes(review.role) }"><span><CircleCheck v-if="flow.reviewApprovals.includes(review.role)" :size="17" /><UserRoundCheck v-else :size="17" /></span><strong>{{ review.label }}</strong><small>{{ flow.reviewApprovals.includes(review.role) ? '已批准并留痕' : review.note }}</small><el-button v-if="flow.reportStatus === 'in_review' && nextReviewer === review.role" size="small" type="primary" @click="approveReview(review.role)">以{{ review.label }}身份批准</el-button></div>
            </div>
            <el-button v-if="flow.reportStatus === 'draft'" type="primary" :icon="Send" @click="submitReport">提交三级审核</el-button>
          </div>
          <div v-else class="empty-result"><FileText :size="34" /><h2>分析完成后生成报告</h2><p>报告的表格、图形和结论段落将绑定数据集版本与统计运行。</p></div>
        </article>
      </section>

      <section v-else class="export-stage two-column">
        <article class="work-panel package-panel">
          <div class="panel-heading"><div><span>最终交付</span><h2>可复现科研成果包</h2></div><el-tag :type="flow.reportStatus === 'approved_frozen' ? 'success' : 'info'">{{ flow.reportStatus === 'approved_frozen' ? '允许生成' : '等待三级审核' }}</el-tag></div>
          <div class="package-tree"><p><FolderArchive :size="18" /><strong>research-package.zip</strong></p><ul><li>清洗后的分析数据 CSV / 数据字典</li><li>纳入排除日志与数据质量报告</li><li>统计计划、结构化结果与图表</li><li>可复现 Python 代码及版本信息</li><li>审核记录、数据血缘与 SHA-256 清单</li></ul></div>
          <div class="download-actions"><el-button :icon="PackageCheck" :loading="artifactLoading" :disabled="flow.reportStatus !== 'approved_frozen'" @click="downloadResearchPackage">下载数据与复现包 ZIP</el-button><el-button type="primary" :icon="Download" :loading="artifactLoading" :disabled="flow.reportStatus !== 'approved_frozen'" @click="downloadMedicalReport">下载医学数据报告 DOCX</el-button></div>
          <el-alert v-if="artifactMessage" type="success" :title="artifactMessage" :closable="false" />
        </article>
        <aside class="work-panel lineage-panel"><div class="panel-heading"><div><span>版本血缘</span><h2>结果可追溯链</h2></div></div><ol><li><Database :size="17" /><div><strong>{{ flow.datasetVersion || '等待数据冻结' }}</strong><small>{{ flow.datasetHash || '-' }}</small></div></li><li><Code2 :size="17" /><div><strong>{{ flow.analysisResult?.runId || '等待统计运行' }}</strong><small>{{ flow.analysisResult?.outputHash || '-' }}</small></div></li><li><FileText :size="17" /><div><strong>{{ flow.reportVersion || '等待报告生成' }}</strong><small>{{ reportStatusLabel }}</small></div></li></ol><el-alert type="info" title="真实论文发表仍需伦理审批、统计复核、医学负责人签署和期刊要求核验。" :closable="false" /></aside>
      </section>
    </main>

    <el-drawer v-model="auditDrawer" title="科研流程审计" size="480px"><div class="audit-list"><article v-for="event in flow.auditEvents" :key="event.eventId"><span></span><div><strong>{{ event.action }}</strong><p>{{ event.detail }}</p><small>{{ formatTime(event.occurredAt) }}</small></div></article></div></el-drawer>
    <button class="audit-fab" title="查看科研流程审计" @click="auditDrawer = true"><History :size="19" /></button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { BarChart3, Check, CheckCircle2, ChevronRight, CircleCheck, Code2, Database, DatabaseZap, Download, FileInput, FileJson2, FilePlus2, FileText, Filter, FolderArchive, History, ListChecks, Minus, PackageCheck, Play, Save, Send, Snowflake, Trash2, Upload, UserRoundCheck } from 'lucide-vue-next'
import { useFlowSimulationStore } from '../stores/flowSimulation'
import { buildResearchArtifactBundle, downloadArtifact, type ResearchArtifactBundle } from '../services/researchArtifacts'

const flow = useFlowSimulationStore()
const activeStage = ref<'topic' | 'data' | 'analysis' | 'report' | 'export'>('topic')
const reportSection = ref('abstract')
const actionError = ref('')
const artifactMessage = ref('')
const artifactLoading = ref(false)
const importing = ref(false)
const auditDrawer = ref(false)
const fileInput = ref<HTMLInputElement>()
let artifactBundle: ResearchArtifactBundle | null = null

const seed = computed(() => flow.scenario?.research)
const protocolForm = reactive({ researchQuestion: '', design: '', observationWindow: '', ethicsStatus: '' })
const protocolComplete = computed(() => Object.values(protocolForm).every(value => value.trim().length >= 8))
const visibleRecords = computed(() => flow.researchRecords.slice(0, 8))
const blockingIssueCount = computed(() => flow.unresolvedQualityIssues.filter(issue => issue.severity === 'blocking').length)
const canFreeze = computed(() => flow.variablesConfirmed && blockingIssueCount.value === 0)
const reportStatusLabel = computed(() => ({ not_started: '尚未生成', draft: '报告草稿', in_review: '三级审核中', approved_frozen: '已终审冻结' } as const)[flow.reportStatus])
const currentStatus = computed(() => flow.reportStatus === 'approved_frozen' ? '成果可导出' : flow.reportStatus === 'in_review' ? '报告审核中' : flow.analysisStatus === 'succeeded' ? '分析已完成' : flow.datasetVersion ? '数据集已冻结' : flow.cohortBuilt ? '队列准备中' : flow.protocolSaved ? '协议已保存' : '研究方案草稿')
const stages = computed(() => [
  { key: 'topic' as const, label: '选题与方案', meta: flow.protocolSaved ? '协议已保存' : '明确 PICO', done: flow.protocolSaved },
  { key: 'data' as const, label: '数据提取', meta: flow.datasetVersion ? '数据集已冻结' : `${flow.researchRecords.length.toLocaleString()} 条候选`, done: Boolean(flow.datasetVersion) },
  { key: 'analysis' as const, label: '算法分析', meta: flow.analysisStatus === 'succeeded' ? '统计完成' : '等待运行', done: flow.analysisStatus === 'succeeded' },
  { key: 'report' as const, label: '报告生成', meta: reportStatusLabel.value, done: flow.reportStatus === 'approved_frozen' },
  { key: 'export' as const, label: '数据导出', meta: flow.reportStatus === 'approved_frozen' ? '成果包就绪' : '审核后开放', done: false }
])
const reportSections = [{ key: 'abstract', label: '结构式摘要' }, { key: 'methods', label: '研究方法' }, { key: 'cohort', label: '研究队列' }, { key: 'baseline', label: '基线特征' }, { key: 'outcomes', label: '结局分析' }, { key: 'subgroups', label: '亚组与敏感性' }, { key: 'limitations', label: '偏倚与局限性' }, { key: 'conclusion', label: '结论草稿' }, { key: 'reproducibility', label: '可复现性' }]
const currentReportLabel = computed(() => reportSections.find(item => item.key === reportSection.value)?.label ?? '报告内容')
const reviewStages = [{ role: 'pharmacist' as const, label: '药师初审', note: '核对药品暴露与变量定义' }, { role: 'statistician' as const, label: '统计师审核', note: '核对模型、诊断与统计口径' }, { role: 'medical_lead' as const, label: '医学负责人终审', note: '核对医学解释与适用边界' }]
const nextReviewer = computed(() => reviewStages[flow.reviewApprovals.length]?.role)

function syncProtocol() { if (seed.value) Object.assign(protocolForm, { researchQuestion: seed.value.project.researchQuestion, design: seed.value.project.design, observationWindow: seed.value.project.observationWindow, ethicsStatus: seed.value.project.ethicsStatus }) }
function runAction(action: () => void, next?: typeof activeStage.value) { actionError.value = ''; try { action(); artifactBundle = null; if (next) activeStage.value = next } catch (error) { actionError.value = error instanceof Error ? error.message : '流程操作失败' } }
function saveProtocol() { if (seed.value) Object.assign(seed.value.project, protocolForm); runAction(() => flow.saveProtocol(), 'data') }
function buildCohort() { runAction(() => flow.buildCohort()) }
function confirmVariables() { runAction(() => flow.confirmVariables()) }
function resolveIssue(id: string) { runAction(() => flow.resolveQualityIssue(id)) }
function freezeDataset() { runAction(() => flow.freezeDataset(), 'analysis') }
async function runAnalysis() { actionError.value = ''; try { await flow.runAnalysis(); activeStage.value = 'report' } catch (error) { actionError.value = error instanceof Error ? error.message : '统计运行失败' } }
function generateReport() { runAction(() => flow.generateReport()) }
function submitReport() { runAction(() => flow.submitReportReview()) }
function approveReview(role: 'pharmacist' | 'statistician' | 'medical_lead') { runAction(() => flow.approveReportStage(role)); if (flow.reportStatus === 'approved_frozen') activeStage.value = 'export' }

async function loadBuiltInDataset() {
  importing.value = true; actionError.value = ''
  try { const response = await fetch('/research/nvaf-doac-comparative.synthetic.v1.json'); if (!response.ok) throw new Error(`内置数据读取失败：${response.status}`); await flow.importResearchText(await response.text(), 'nvaf-doac-comparative.synthetic.v1.json'); syncProtocol(); activeStage.value = 'topic' }
  catch (error) { actionError.value = error instanceof Error ? error.message : '导入失败' }
  finally { importing.value = false }
}
async function importFile(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; importing.value = true; try { await flow.importResearchText(await file.text(), file.name); syncProtocol(); activeStage.value = 'topic' } catch (error) { actionError.value = error instanceof Error ? error.message : '导入失败' } finally { importing.value = false; input.value = '' } }
function clearDemoData() { flow.clearScenario(); activeStage.value = 'topic'; actionError.value = ''; artifactBundle = null }

async function ensureArtifactBundle() {
  if (artifactBundle) return artifactBundle
  if (flow.reportStatus !== 'approved_frozen' || !seed.value || !flow.analysisResult || !flow.scenario) throw new Error('三级审核完成后才能生成成果包')
  artifactLoading.value = true
  try { artifactBundle = await buildResearchArtifactBundle({ seed: seed.value, records: flow.includedRecords, excludedRecords: flow.researchRecords.filter(record => !flow.cohortRecordIds.includes(record.recordId)), resolvedQualityIssueIds: flow.resolvedQualityIssues, analysis: flow.analysisResult, datasetVersion: flow.datasetVersion, datasetHash: flow.datasetHash, reportVersion: flow.reportVersion, reportSections: flow.reportSections, auditEvents: flow.auditEvents, synthetic: true, scenarioDisclaimer: '合成数据仅用于流程验证，不构成医学证据或论文结论。' }); return artifactBundle } finally { artifactLoading.value = false }
}
async function downloadResearchPackage() { try { const bundle = await ensureArtifactBundle(); downloadArtifact(bundle.zip, bundle.zipName); artifactMessage.value = `已生成 ${bundle.zipName}，包含带 SHA-256 的可复现材料。` } catch (error) { actionError.value = error instanceof Error ? error.message : '成果包生成失败' } }
async function downloadMedicalReport() { try { const bundle = await ensureArtifactBundle(); downloadArtifact(bundle.report, bundle.reportName); artifactMessage.value = `已生成 ${bundle.reportName}，与当前冻结数据集和统计运行绑定。` } catch (error) { actionError.value = error instanceof Error ? error.message : '报告生成失败' } }
function formatTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }

watch(() => flow.revision, () => syncProtocol())
onMounted(async () => { await flow.ensureScenario(); syncProtocol() })
</script>

<style scoped>
.research-page{min-height:100%;padding:22px 26px 70px;background:#f6f8f9;color:#17232b}.research-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:14px}.research-header h1{margin:2px 0 4px;font-size:27px;line-height:1.3;letter-spacing:0}.research-header p{margin:0;color:#66757f;font-size:14px}.eyebrow{color:#13766d;font-size:12px;font-weight:700}.header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.file-input{display:none}.action-alert{margin-top:10px}.project-strip{display:grid;grid-template-columns:minmax(320px,1.6fr) repeat(3,minmax(170px,1fr));gap:0;margin-top:14px;background:#fff;border:1px solid #dfe6e8;border-radius:6px}.project-strip>div{padding:14px 18px;border-right:1px solid #e7ecee;min-width:0}.project-strip>div:last-child{border-right:0}.project-strip span,.project-strip small{display:block;color:#73818a;font-size:12px}.project-strip strong{display:block;margin:5px 0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.project-main strong{font-size:16px}.stage-nav{display:grid;grid-template-columns:repeat(5,1fr);margin:14px 0;background:#fff;border:1px solid #dfe6e8;border-radius:6px;overflow:hidden}.stage-nav button{display:flex;align-items:center;gap:10px;padding:12px 16px;border:0;border-right:1px solid #e7ecee;background:#fff;color:#6a7881;text-align:left;cursor:pointer}.stage-nav button:last-child{border-right:0}.stage-nav button.active{background:#eef8f6;color:#0f675f}.stage-nav button.done .stage-index{background:#168579;color:#fff;border-color:#168579}.stage-nav strong,.stage-nav small{display:block}.stage-nav strong{font-size:14px}.stage-nav small{margin-top:3px;font-size:11px;font-weight:400}.stage-index{width:27px;height:27px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #cbd6da;border-radius:50%;font-size:12px;font-weight:700}.stage-workspace{min-width:0}.two-column{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,.85fr);gap:14px}.work-panel{background:#fff;border:1px solid #dfe6e8;border-radius:6px;padding:18px;min-width:0}.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.panel-heading span,.panel-heading small{color:#74828b;font-size:12px}.panel-heading h2{margin:4px 0 0;font-size:17px;line-height:1.45;letter-spacing:0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.definition-list{margin:0}.definition-list>div{display:grid;grid-template-columns:88px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid #edf1f2}.definition-list dt{color:#74828b;font-size:12px}.definition-list dd{margin:0;font-size:13px;font-weight:600}.criteria{margin-top:18px}.criteria h3{margin:14px 0 7px;font-size:13px}.criteria p{display:flex;align-items:flex-start;gap:7px;margin:7px 0;color:#53636d;font-size:13px}.metrics-row{display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:14px;background:#fff;border:1px solid #dfe6e8;border-radius:6px}.metrics-row>div{padding:16px 18px;border-right:1px solid #e7ecee}.metrics-row>div:last-child{border:0}.metrics-row span,.metrics-row small{display:block;color:#718089;font-size:12px}.metrics-row strong{display:block;margin:5px 0;font-size:24px;line-height:1}.pipeline-panel{margin-bottom:14px}.pipeline-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.pipeline-actions button{display:flex;align-items:center;gap:10px;padding:13px;border:1px solid #dce4e7;border-radius:5px;background:#fafbfb;color:#40515b;text-align:left}.pipeline-actions button:not(:disabled){cursor:pointer}.pipeline-actions button.complete{border-color:#9ccfc7;background:#f0f8f6;color:#125f58}.pipeline-actions button:disabled{opacity:.55}.pipeline-actions strong,.pipeline-actions small{display:block}.pipeline-actions strong{font-size:13px}.pipeline-actions small{margin-top:3px;color:#75838b;font-size:11px}.data-detail{grid-template-columns:minmax(0,1.7fr) minmax(300px,.7fr)}.table-scroll{overflow:auto}.research-table{width:100%;border-collapse:collapse;font-size:13px}.research-table th{padding:10px 12px;background:#f3f6f7;color:#596872;font-size:12px;text-align:left;white-space:nowrap}.research-table td{padding:11px 12px;border-bottom:1px solid #edf1f2;white-space:nowrap}.research-table td strong,.research-table td small{display:block}.research-table td small{margin-top:3px;color:#7a8790;font-size:11px}.event-value{color:#587079}.event-value.yes{color:#b13b3b;font-weight:700}.issue-list{display:grid;gap:9px;max-height:420px;overflow:auto}.issue-list article{padding:12px;border-left:3px solid #d58a25;background:#fafbfb}.issue-list article.resolved{border-left-color:#228276;opacity:.72}.issue-list header{display:flex;align-items:center;justify-content:space-between}.issue-list article>strong,.issue-list article>small{display:block}.issue-list article>strong{margin:9px 0 4px;font-size:13px}.issue-list article p,.issue-list article small{margin:0 0 9px;color:#6b7982;font-size:12px}.analysis-top{margin-bottom:14px}.method-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:20px 0}.method-flow span{padding:8px 10px;border:1px solid #bdd5d1;border-radius:4px;background:#f0f7f6;color:#145f58;font-size:12px;font-weight:700}.method-meta{color:#687780;font-size:12px}.output-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}.output-list li{display:flex;gap:8px;align-items:flex-start;color:#4f616b;font-size:13px}.result-panel{margin-top:0}.outcome-table strong{font-size:14px}.effect-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}.effect-grid article{padding:14px;border:1px solid #dfe6e8;border-radius:5px}.effect-grid span,.effect-grid small{display:block;color:#718089;font-size:12px}.effect-grid strong{display:block;margin:6px 0;font-size:17px}.effect-grid p{margin:0 0 5px;font-size:13px}.hash-line{margin-top:14px;color:#6e7c84;font-size:12px}.empty-result,.empty-import{display:grid;place-items:center;padding:64px 24px;background:#fff;border:1px dashed #cbd7da;border-radius:6px;color:#6d7b84;text-align:center}.empty-result h2,.empty-import h2{margin:10px 0 4px;color:#26363f;font-size:17px}.empty-result p,.empty-import p{margin:0 0 16px;max-width:600px;font-size:13px}.report-stage{grid-template-columns:280px minmax(0,1fr)}.report-nav{align-self:start}.report-nav>button{width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:0;border-radius:4px;background:transparent;color:#53646e;text-align:left;cursor:pointer}.report-nav>button span{flex:1}.report-nav>button.active{background:#eef6f5;color:#12665f;font-weight:700}.report-nav>.el-button{margin-top:14px}.review-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}.review-flow>div{padding:12px;border:1px solid #dfe6e8;border-radius:5px}.review-flow>div.complete{border-color:#9bcfc7;background:#f0f8f6}.review-flow span,.review-flow strong,.review-flow small{display:block}.review-flow strong{margin:7px 0 4px;font-size:13px}.review-flow small{min-height:32px;color:#708088;font-size:11px}.review-flow .el-button{margin-top:9px}.package-tree{padding:16px;background:#f7f9fa;border:1px solid #e3e9eb;border-radius:5px}.package-tree p{display:flex;align-items:center;gap:8px;margin:0}.package-tree ul{margin:12px 0 0 26px;padding:0;color:#53646e;font-size:13px;line-height:1.9}.download-actions{display:flex;gap:10px;margin:16px 0}.lineage-panel ol{margin:0 0 18px;padding:0;list-style:none}.lineage-panel li{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #edf1f2}.lineage-panel li strong,.lineage-panel li small{display:block}.lineage-panel li small{margin-top:4px;color:#74828a;font-size:11px}.audit-fab{position:fixed;right:24px;bottom:22px;width:42px;height:42px;display:grid;place-items:center;border:1px solid #cbd7da;border-radius:50%;background:#fff;color:#32545b;box-shadow:0 5px 18px rgba(28,48,58,.13);cursor:pointer}.audit-list article{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #edf1f2}.audit-list article>span{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#188377}.audit-list p{margin:4px 0;color:#5d6d76;font-size:12px}.audit-list small{color:#88949b;font-size:11px}@media(max-width:1200px){.research-page{padding:18px}.research-header{flex-direction:column}.header-actions{justify-content:flex-start}.project-strip{grid-template-columns:1.5fr 1fr}.project-strip>div:nth-child(2){border-right:0}.project-strip>div:nth-child(-n+2){border-bottom:1px solid #e7ecee}.two-column{grid-template-columns:1fr}.stage-nav button{padding:10px}.stage-nav small{display:none}.pipeline-actions{grid-template-columns:repeat(2,1fr)}.review-flow{grid-template-columns:1fr}.metrics-row{grid-template-columns:repeat(2,1fr)}}
</style>
