import { defineStore } from 'pinia'
import Ajv2020, { type ErrorObject } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import scenarioSchema from '../contracts/flowScenario.schema.json'
import type {
  AnalysisResult,
  DraftStatus,
  FlowAuditEvent,
  FlowScenario,
  OutcomeRecord,
  ResearchRecord,
  SimulatedDecision
} from '../types/flowScenario'

const STORAGE_KEY = 'hospitalai.frontend-flow.v1'
const DEFAULT_SCENARIO_URL = '/scenarios/cap-full-flow.v1.json'
const draftSequence: DraftStatus[] = ['CREATED', 'WRITE_QUEUED', 'HIS_DRAFT_CREATED', 'CALLBACK_CONFIRMED']
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validateScenario = ajv.compile<FlowScenario>(scenarioSchema)

interface PersistedFlow {
  scenario: FlowScenario
  sourceName: string
  importedAt: string
  decisions: Record<string, SimulatedDecision>
  outcomes: Record<string, OutcomeRecord>
  protocolSaved: boolean
  cohortBuilt: boolean
  cohortRecordIds: string[]
  variablesConfirmed: boolean
  resolvedQualityIssues: string[]
  datasetVersion: string
  datasetHash: string
  analysisStatus: 'idle' | 'running' | 'succeeded'
  analysisResult: AnalysisResult | null
  reportStatus: 'not_started' | 'draft' | 'in_review' | 'approved_frozen'
  reportVersion: string
  reportSections: Record<string, string>
  knowledgeStatus: 'not_submitted' | 'review_pending'
  auditEvents: FlowAuditEvent[]
}

interface WorkflowState {
  decisions: Record<string, SimulatedDecision>
  outcomes: Record<string, OutcomeRecord>
  protocolSaved: boolean
  cohortBuilt: boolean
  cohortRecordIds: string[]
  variablesConfirmed: boolean
  resolvedQualityIssues: string[]
  datasetVersion: string
  datasetHash: string
  analysisStatus: 'idle' | 'running' | 'succeeded'
  analysisResult: AnalysisResult | null
  reportStatus: 'not_started' | 'draft' | 'in_review' | 'approved_frozen'
  reportVersion: string
  reportSections: Record<string, string>
  knowledgeStatus: 'not_submitted' | 'review_pending'
  auditEvents: FlowAuditEvent[]
}

function emptyWorkflow(): WorkflowState {
  return {
    decisions: {} as Record<string, SimulatedDecision>,
    outcomes: {} as Record<string, OutcomeRecord>,
    protocolSaved: false,
    cohortBuilt: false,
    cohortRecordIds: [] as string[],
    variablesConfirmed: false,
    resolvedQualityIssues: [] as string[],
    datasetVersion: '',
    datasetHash: '',
    analysisStatus: 'idle',
    analysisResult: null as AnalysisResult | null,
    reportStatus: 'not_started',
    reportVersion: '',
    reportSections: {} as Record<string, string>,
    knowledgeStatus: 'not_submitted',
    auditEvents: [] as FlowAuditEvent[]
  }
}

function now() {
  return new Date().toISOString()
}

function stableHash(value: unknown) {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function validationMessages(errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map(error => `${error.instancePath || '/'} ${error.message || '校验失败'}`)
}

export const useFlowSimulationStore = defineStore('flowSimulation', {
  state: () => ({
    scenario: null as FlowScenario | null,
    sourceName: '',
    importedAt: '',
    loading: false,
    importDialogVisible: false,
    revision: 0,
    validationErrors: [] as string[],
    ...emptyWorkflow()
  }),
  getters: {
    isReady: state => Boolean(state.scenario),
    worklist: state => state.scenario?.worklist ?? [],
    currentScenarioLabel: state => state.scenario ? `${state.scenario.metadata.name} · v${state.scenario.metadata.version}` : '尚未导入场景',
    completedOutcomeCount: state => Object.keys(state.outcomes).length,
    researchRecords(state): ResearchRecord[] {
      if (!state.scenario) return []
      const liveRecords = Object.values(state.outcomes).map(outcome => {
        const decision = state.decisions[outcome.encounterId]
        const workbench = state.scenario?.workbenches.find(item => item.encounter.encounterId === outcome.encounterId)
        const worklist = state.scenario?.worklist.find(item => item.encounterId === outcome.encounterId)
        return {
          recordId: `LIVE-${outcome.encounterId}`,
          patientId: workbench?.patient.patientId ?? 'UNKNOWN',
          encounterId: outcome.encounterId,
          age: workbench?.patient.age ?? 0,
          sex: workbench?.patient.sex ?? 'U',
          diagnosis: workbench?.encounter.diagnosis ?? '',
          admittedAt: worklist?.admittedAt ?? outcome.recordedAt,
          regimen: outcome.actualRegimen || decision?.finalRegimen || '',
          treatmentResponse: outcome.treatmentResponse,
          adverseEvent: outcome.adverseEvent,
          followupComplete: outcome.followupComplete,
          sourceVersion: `frontend-flow:${state.scenario?.metadata.version ?? 'unknown'}`
        } satisfies ResearchRecord
      })
      return [...state.scenario.research.historicalRecords, ...liveRecords]
    },
    includedRecords(): ResearchRecord[] {
      const ids = new Set(this.cohortRecordIds)
      return this.researchRecords.filter(record => ids.has(record.recordId))
    },
    unresolvedQualityIssues(state) {
      return state.scenario?.research.qualityIssues.filter(issue => !state.resolvedQualityIssues.includes(issue.issueId)) ?? []
    },
    researchProgress(state): number {
      return [state.protocolSaved, state.cohortBuilt, state.variablesConfirmed, Boolean(state.datasetVersion), state.analysisStatus === 'succeeded', state.reportStatus !== 'not_started', state.reportStatus === 'approved_frozen', state.knowledgeStatus === 'review_pending'].filter(Boolean).length
    }
  },
  actions: {
    async ensureScenario() {
      if (this.scenario) return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const persisted = JSON.parse(saved) as PersistedFlow
          if (validateScenario(persisted.scenario)) {
            this.$patch(persisted)
            return
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      await this.loadBundledScenario()
    },
    async loadBundledScenario() {
      this.loading = true
      try {
        const response = await fetch(DEFAULT_SCENARIO_URL)
        if (!response.ok) throw new Error(`示例场景读取失败：${response.status}`)
        await this.importText(await response.text(), 'cap-full-flow.v1.json')
      } finally {
        this.loading = false
      }
    },
    async importText(text: string, sourceName: string) {
      this.validationErrors = []
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        this.validationErrors = [error instanceof Error ? `JSON 解析失败：${error.message}` : 'JSON 解析失败']
        throw new Error(this.validationErrors[0])
      }
      if (!validateScenario(parsed)) {
        this.validationErrors = validationMessages(validateScenario.errors)
        throw new Error(`场景包不符合 hospitalai.frontend-flow.v1：${this.validationErrors.join('；')}`)
      }
      const encounterIds = new Set(parsed.worklist.map(item => item.encounterId))
      const missingWorkbenches = parsed.workbenches.filter(item => !encounterIds.has(item.encounter.encounterId))
      if (missingWorkbenches.length || parsed.workbenches.length !== parsed.worklist.length) {
        this.validationErrors = ['worklist 与 workbenches 必须按 encounterId 一一对应']
        throw new Error(this.validationErrors[0])
      }
      this.scenario = structuredClone(parsed)
      this.sourceName = sourceName
      this.importedAt = now()
      this.$patch(emptyWorkflow())
      this.revision += 1
      this.addAudit('scenario', 'SCENARIO_IMPORTED', `${parsed.metadata.scenarioId} · ${sourceName}`)
      this.persist()
    },
    getWorkbench(encounterId: string) {
      return this.scenario?.workbenches.find(item => item.encounter.encounterId === encounterId)
    },
    decisionFor(encounterId: string) {
      return this.decisions[encounterId]
    },
    recordDecision(input: { encounterId: string; recommendationId: string; action: 'adopt' | 'modify' | 'reject'; candidateId: string; reason: string; finalRegimen: string }) {
      const workbench = this.getWorkbench(input.encounterId)
      const candidate = workbench?.candidates.find(item => item.candidateId === input.candidateId)
      if (!workbench || !candidate) throw new Error('无法定位导入场景中的推荐与候选')
      if (input.action !== 'reject' && (candidate.blocked || workbench.alerts.some(alert => alert.blocking))) {
        throw new Error('命中医疗硬阻断，任何角色均不能创建处方草稿')
      }
      const timestamp = now()
      const rejected = input.action === 'reject'
      const decision: SimulatedDecision = {
        decisionId: `DEC-${input.encounterId}-${Date.now()}`,
        encounterId: input.encounterId,
        patientId: workbench.patient.patientId,
        recommendationId: input.recommendationId,
        action: input.action,
        candidateId: input.candidateId,
        finalRegimen: input.finalRegimen,
        reason: input.reason,
        decidedAt: timestamp,
        draftId: rejected ? '' : `DRAFT-${input.encounterId}-${Date.now()}`,
        draftStatus: rejected ? 'NO_DRAFT_FOR_REJECTION' : 'CREATED'
      }
      this.decisions[input.encounterId] = decision
      delete this.outcomes[input.encounterId]
      this.invalidateResearch('新增或修改医生决策')
      this.addAudit('decision', `RECOMMENDATION_${input.action.toUpperCase()}`, `${input.encounterId} · ${input.candidateId}`)
      this.persist()
      return decision
    },
    advanceDraft(encounterId: string) {
      const decision = this.decisions[encounterId]
      if (!decision || decision.draftStatus === 'NO_DRAFT_FOR_REJECTION') throw new Error('当前决策没有可回写的处方草稿')
      const index = draftSequence.indexOf(decision.draftStatus)
      if (index < draftSequence.length - 1) decision.draftStatus = draftSequence[index + 1]
      this.addAudit('draft', decision.draftStatus, `${decision.draftId} · ${encounterId}`)
      this.persist()
      return decision.draftStatus
    },
    recordOutcome(encounterId: string, values: Omit<OutcomeRecord, 'encounterId' | 'recordedAt'>) {
      const decision = this.decisions[encounterId]
      if (!decision || decision.draftStatus !== 'CALLBACK_CONFIRMED') throw new Error('必须先完成 HIS 草稿状态回调，才能记录实际用药与结局')
      this.outcomes[encounterId] = { encounterId, ...values, recordedAt: now() }
      this.invalidateResearch('新增实际用药与结局记录')
      this.addAudit('outcome', 'OUTCOME_RECORDED', `${encounterId} · ${values.treatmentResponse}`)
      this.persist()
    },
    saveProtocol() {
      this.protocolSaved = true
      this.invalidateAfter('protocol')
      this.addAudit('research', 'PROTOCOL_SAVED', this.scenario?.research.project.protocolVersion ?? '')
      this.persist()
    },
    buildCohort() {
      if (!this.protocolSaved) throw new Error('请先保存研究方案')
      this.cohortRecordIds = this.researchRecords.filter(record => record.age >= 18 && /社区获得性肺炎/.test(record.diagnosis) && Boolean(record.regimen)).map(record => record.recordId)
      this.cohortBuilt = true
      this.invalidateAfter('cohort')
      this.addAudit('research', 'COHORT_BUILT', `纳入 ${this.cohortRecordIds.length} 条记录`)
      this.persist()
    },
    confirmVariables() {
      if (!this.cohortBuilt) throw new Error('请先生成研究队列')
      this.variablesConfirmed = true
      this.invalidateAfter('variables')
      this.addAudit('research', 'VARIABLES_CONFIRMED', `${this.scenario?.research.variables.length ?? 0} 个变量`)
      this.persist()
    },
    resolveQualityIssue(issueId: string) {
      if (!this.resolvedQualityIssues.includes(issueId)) this.resolvedQualityIssues.push(issueId)
      this.invalidateAfter('quality')
      this.addAudit('research', 'QUALITY_ISSUE_RESOLVED', issueId)
      this.persist()
    },
    freezeDataset() {
      if (!this.variablesConfirmed) throw new Error('请先确认变量字典')
      const blocking = this.unresolvedQualityIssues.filter(issue => issue.severity === 'blocking')
      if (blocking.length) throw new Error(`仍有 ${blocking.length} 项阻断级质量问题未处理`)
      this.datasetVersion = `DS-${this.scenario?.research.project.projectId ?? 'PROJECT'}-v1`
      this.datasetHash = stableHash(this.includedRecords)
      this.analysisStatus = 'idle'
      this.analysisResult = null
      this.reportStatus = 'not_started'
      this.addAudit('research', 'DATASET_FROZEN', `${this.datasetVersion} · ${this.datasetHash}`)
      this.persist()
    },
    async runAnalysis() {
      if (!this.datasetVersion) throw new Error('未冻结的数据集不能运行统计分析')
      this.analysisStatus = 'running'
      this.persist()
      await new Promise(resolve => setTimeout(resolve, 450))
      const records = this.includedRecords
      const distribution = new Map<string, number>()
      records.forEach(record => distribution.set(record.regimen, (distribution.get(record.regimen) ?? 0) + 1))
      const resultBase = {
        datasetVersion: this.datasetVersion,
        inputHash: this.datasetHash,
        sampleSize: records.length,
        improvedCount: records.filter(record => record.treatmentResponse === 'improved').length,
        adverseEventCount: records.filter(record => record.adverseEvent).length,
        followupMissingCount: records.filter(record => !record.followupComplete).length,
        regimenDistribution: [...distribution].map(([regimen, count]) => ({ regimen, count }))
      }
      this.analysisResult = {
        runId: `RUN-${Date.now()}`,
        ...resultBase,
        outputHash: stableHash(resultBase),
        generatedAt: now()
      }
      this.analysisStatus = 'succeeded'
      this.addAudit('research', 'ANALYSIS_SUCCEEDED', `${this.analysisResult.runId} · n=${records.length}`)
      this.persist()
    },
    generateReport() {
      if (!this.analysisResult) throw new Error('统计分析完成后才能生成报告草稿')
      const project = this.scenario?.research.project
      const template = this.scenario?.research.reportTemplate
      this.reportVersion = 'RPT-CAP-FLOW-v1'
      this.reportStatus = 'draft'
      this.reportSections = {
        question: `${project?.researchQuestion ?? ''}\n研究设计：${project?.design ?? ''}`,
        cohort: `共纳入 ${this.analysisResult.sampleSize} 条合成记录。纳入和排除标准见方案 ${project?.protocolVersion ?? ''}。`,
        exposure: this.analysisResult.regimenDistribution.map(item => `${item.regimen}：${item.count} 例`).join('\n'),
        outcomes: `治疗反应改善 ${this.analysisResult.improvedCount} 例；不良事件 ${this.analysisResult.adverseEventCount} 例；随访缺失 ${this.analysisResult.followupMissingCount} 例。`,
        limitations: template?.limitations.join('；') ?? '',
        conclusion: `AI 草稿：本次结果只描述导入验证队列中的流程与分布。${template?.applicability ?? ''}`
      }
      this.addAudit('research', 'REPORT_DRAFT_GENERATED', this.reportVersion)
      this.persist()
    },
    submitReportReview() {
      if (this.reportStatus !== 'draft') throw new Error('只有报告草稿可以提交审核')
      this.reportStatus = 'in_review'
      this.addAudit('research', 'REPORT_SUBMITTED', this.reportVersion)
      this.persist()
    },
    approveAndFreezeReport() {
      if (this.reportStatus !== 'in_review') throw new Error('报告必须先提交审核')
      this.reportStatus = 'approved_frozen'
      this.addAudit('research', 'REPORT_APPROVED_AND_FROZEN', this.reportVersion)
      this.persist()
    },
    submitKnowledge() {
      if (this.reportStatus !== 'approved_frozen') throw new Error('未审核冻结的报告不能提交知识审核')
      this.knowledgeStatus = 'review_pending'
      this.addAudit('knowledge', 'KNOWLEDGE_SUBMITTED', `${this.reportVersion} · review_pending`)
      this.persist()
    },
    invalidateResearch(reason: string) {
      if (!this.cohortBuilt && !this.datasetVersion) return
      this.cohortBuilt = false
      this.cohortRecordIds = []
      this.variablesConfirmed = false
      this.resolvedQualityIssues = []
      this.datasetVersion = ''
      this.datasetHash = ''
      this.analysisStatus = 'idle'
      this.analysisResult = null
      this.reportStatus = 'not_started'
      this.reportVersion = ''
      this.reportSections = {}
      this.knowledgeStatus = 'not_submitted'
      this.addAudit('research', 'DOWNSTREAM_INVALIDATED', reason)
    },
    invalidateAfter(stage: 'protocol' | 'cohort' | 'variables' | 'quality') {
      if (stage === 'protocol') {
        this.cohortBuilt = false
        this.cohortRecordIds = []
      }
      if (stage === 'protocol' || stage === 'cohort') this.variablesConfirmed = false
      if (stage !== 'quality') this.resolvedQualityIssues = []
      this.datasetVersion = ''
      this.datasetHash = ''
      this.analysisStatus = 'idle'
      this.analysisResult = null
      this.reportStatus = 'not_started'
      this.reportVersion = ''
      this.reportSections = {}
      this.knowledgeStatus = 'not_submitted'
    },
    addAudit(category: FlowAuditEvent['category'], action: string, detail: string) {
      this.auditEvents.unshift({ eventId: `FLOW-AUD-${Date.now()}-${this.auditEvents.length + 1}`, category, action, detail, occurredAt: now() })
    },
    persist() {
      if (!this.scenario) return
      const data: PersistedFlow = {
        scenario: this.scenario,
        sourceName: this.sourceName,
        importedAt: this.importedAt,
        decisions: this.decisions,
        outcomes: this.outcomes,
        protocolSaved: this.protocolSaved,
        cohortBuilt: this.cohortBuilt,
        cohortRecordIds: this.cohortRecordIds,
        variablesConfirmed: this.variablesConfirmed,
        resolvedQualityIssues: this.resolvedQualityIssues,
        datasetVersion: this.datasetVersion,
        datasetHash: this.datasetHash,
        analysisStatus: this.analysisStatus,
        analysisResult: this.analysisResult,
        reportStatus: this.reportStatus,
        reportVersion: this.reportVersion,
        reportSections: this.reportSections,
        knowledgeStatus: this.knowledgeStatus,
        auditEvents: this.auditEvents
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    resetWorkflow() {
      this.$patch(emptyWorkflow())
      this.revision += 1
      this.addAudit('scenario', 'WORKFLOW_RESET', this.scenario?.metadata.scenarioId ?? '')
      this.persist()
    }
  }
})
