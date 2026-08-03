import { defineStore } from 'pinia'
import {
  fetchAdrReviews,
  fetchAnalysisTasks,
  fetchKnowledgeSubmissions,
  fetchResearchArtifact,
  fetchWorkbench,
  fetchWorklist,
  processNextAnalysisTask,
  resolveAdrReview,
  reviewKnowledgeSubmission,
  submitDecision,
  type AdverseDrugReactionSummary,
  type CandidatePlan,
  type KnowledgeSubmissionSummary,
  type ResearchAnalysisTaskSummary,
  type ResearchArtifactContent,
  type WorkbenchPayload,
  type WorklistItem
} from '../services/coreApi'
import { previewAdrReviews, previewKnowledgeSubmissions, previewWorkbench, previewWorklist } from '../data/previewData'
import { useFlowSimulationStore } from './flowSimulation'

const uiPreviewOnly = import.meta.env.VITE_UI_PREVIEW === 'true'

export const useWorkbenchStore = defineStore('workbench', {
  state: () => ({
    payload: null as WorkbenchPayload | null,
    worklist: [] as WorklistItem[],
    loading: false,
    error: '',
    selectedCandidateId: '',
    decisionResult: null as null | Record<string, unknown>,
    modifyText: '',
    adrReviews: [] as AdverseDrugReactionSummary[],
    knowledgeSubmissions: [] as KnowledgeSubmissionSummary[],
    analysisTasks: [] as ResearchAnalysisTaskSummary[],
    artifact: null as ResearchArtifactContent | null,
    opsResult: '',
    opsLoading: false,
    decisionLoading: false,
    previewMode: false
  }),
  getters: {
    selectedCandidate(state): CandidatePlan | undefined {
      return state.payload?.candidates.find(candidate => candidate.candidateId === state.selectedCandidateId)
    },
    hasBlockingRisk(state): boolean {
      return Boolean(state.payload?.alerts.some(alert => alert.blocking))
    },
    aiDegraded(state): boolean {
      return state.payload?.aiStatus === 'degraded' || Boolean(state.payload?.stages.some(stage => stage.status === 'degraded'))
    }
  },
  actions: {
    async loadWorklist() {
      this.error = ''
      if (uiPreviewOnly) {
        const flow = useFlowSimulationStore()
        await flow.ensureScenario()
        this.worklist = flow.worklist
        this.previewMode = true
        return
      }
      try {
        this.worklist = await fetchWorklist()
      } catch (error) {
        try {
          const flow = useFlowSimulationStore()
          await flow.ensureScenario()
          this.worklist = flow.worklist
          this.previewMode = true
          this.error = ''
        } catch {
          this.worklist = previewWorklist
          this.previewMode = true
          this.error = error instanceof Error ? `${error.message}；已使用旧版内置数据` : '已使用旧版内置数据'
        }
      }
    },
    async load(encounterId: string) {
      this.loading = true
      this.error = ''
      this.decisionResult = null
      if (uiPreviewOnly) {
        const flow = useFlowSimulationStore()
        await flow.ensureScenario()
        this.payload = JSON.parse(JSON.stringify(flow.getWorkbench(encounterId) ?? flow.scenario?.workbenches[0] ?? previewWorkbench(encounterId))) as WorkbenchPayload
        this.selectedCandidateId = this.payload.candidates[0]?.candidateId ?? ''
        this.modifyText = this.payload.candidates[0]?.regimen ?? ''
        const existingDecision = flow.decisionFor(this.payload.encounter.encounterId)
        this.decisionResult = existingDecision ? { ...existingDecision, prescriptionDraftId: existingDecision.draftId } : null
        this.previewMode = true
        this.loading = false
        return
      }
      try {
        this.payload = await fetchWorkbench(encounterId)
        this.selectedCandidateId = this.payload.candidates[0]?.candidateId ?? ''
        this.modifyText = this.payload.candidates[0]?.regimen ?? ''
      } catch (error) {
        const flow = useFlowSimulationStore()
        try {
          await flow.ensureScenario()
        } catch {
          // The legacy generator remains only as a last-resort degraded state.
        }
        this.payload = JSON.parse(JSON.stringify(flow.getWorkbench(encounterId) ?? previewWorkbench(encounterId))) as WorkbenchPayload
        this.selectedCandidateId = this.payload.candidates[0]?.candidateId ?? ''
        this.modifyText = this.payload.candidates[0]?.regimen ?? ''
        this.previewMode = true
        this.error = ''
      } finally {
        this.loading = false
      }
    },
    async loadOps() {
      this.opsLoading = true
      this.error = ''
      if (uiPreviewOnly) {
        this.adrReviews = previewAdrReviews
        this.knowledgeSubmissions = previewKnowledgeSubmissions
        this.previewMode = true
        this.opsLoading = false
        return
      }
      try {
        const [adrReviews, knowledgeSubmissions] = await Promise.all([
          fetchAdrReviews('review_pending'),
          fetchKnowledgeSubmissions('review_pending')
        ])
        this.adrReviews = adrReviews
        this.knowledgeSubmissions = knowledgeSubmissions
      } catch (error) {
        this.adrReviews = previewAdrReviews
        this.knowledgeSubmissions = previewKnowledgeSubmissions
        this.previewMode = true
        this.error = ''
      } finally {
        this.opsLoading = false
      }
    },
    async loadAnalysisTasks(cohortId: string) {
      this.analysisTasks = await fetchAnalysisTasks(cohortId)
    },
    async decide(action: 'adopt' | 'modify' | 'reject', reason: string) {
      if (!this.payload || !this.selectedCandidateId) return
      this.decisionLoading = true
      this.error = ''
      if (this.previewMode) {
        try {
          const flow = useFlowSimulationStore()
          const decision = flow.recordDecision({
            encounterId: this.payload.encounter.encounterId,
            recommendationId: this.payload.recommendationId,
            action,
            candidateId: this.selectedCandidateId,
            reason,
            finalRegimen: action === 'modify' ? this.modifyText : this.selectedCandidate?.regimen ?? ''
          })
          this.decisionResult = { ...decision, prescriptionDraftId: decision.draftId }
        } catch (error) {
          this.error = error instanceof Error ? error.message : '前端流程审核失败'
        } finally {
          this.decisionLoading = false
        }
        return
      }
      try {
        this.decisionResult = await submitDecision(this.payload.recommendationId, {
          action,
          candidateId: this.selectedCandidateId,
          reason,
          modifiedRegimen: action === 'modify' ? this.modifyText : undefined,
          riskHandling: { uiAcknowledgedAt: new Date().toISOString() }
        })
      } catch (error) {
        this.error = error instanceof Error ? error.message : '审核提交失败'
      } finally {
        this.decisionLoading = false
      }
    },
    async resolveAdr(adrId: string, decision: 'confirm' | 'reject') {
      const result = await resolveAdrReview(adrId, decision, decision === 'confirm' ? '药师确认严重ADR，进入后续推荐强提醒' : '药师驳回ADR升级')
      this.opsResult = `ADR ${result.adrId} 已${result.reviewStatus}`
      await this.loadOps()
      if (this.payload) await this.load(this.payload.encounter.encounterId)
    },
    async reviewKnowledge(submissionId: string, decision: 'approve' | 'reject') {
      const result = await reviewKnowledgeSubmission(submissionId, 'pharmacist', decision, decision === 'approve' ? '药师审核通过' : '药师驳回')
      this.opsResult = `知识审核已记录：${String(result.decision)}`
      await this.loadOps()
    },
    async processResearchTask() {
      const result = await processNextAnalysisTask()
      this.opsResult = `科研统计Worker：${String(result.status)}`
      const cohortId = (result.task as ResearchAnalysisTaskSummary | undefined)?.cohortId
      if (cohortId) await this.loadAnalysisTasks(cohortId)
    },
    async readArtifact(uri: string) {
      this.artifact = await fetchResearchArtifact(uri)
      this.opsResult = `已读取产物：${this.artifact.sha256.slice(0, 12)}`
    }
  }
})
