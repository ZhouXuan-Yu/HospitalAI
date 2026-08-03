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
        this.worklist = previewWorklist
        this.previewMode = true
        return
      }
      try {
        this.worklist = await fetchWorklist()
      } catch (error) {
        this.worklist = previewWorklist
        this.previewMode = true
        this.error = ''
      }
    },
    async load(encounterId: string) {
      this.loading = true
      this.error = ''
      this.decisionResult = null
      if (uiPreviewOnly) {
        this.payload = previewWorkbench(encounterId)
        this.selectedCandidateId = this.payload.candidates[0]?.candidateId ?? ''
        this.modifyText = this.payload.candidates[0]?.regimen ?? ''
        this.previewMode = true
        this.loading = false
        return
      }
      try {
        this.payload = await fetchWorkbench(encounterId)
        this.selectedCandidateId = this.payload.candidates[0]?.candidateId ?? ''
        this.modifyText = this.payload.candidates[0]?.regimen ?? ''
      } catch (error) {
        this.payload = previewWorkbench(encounterId)
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
      try {
        this.decisionResult = await submitDecision(this.payload.recommendationId, {
          action,
          candidateId: this.selectedCandidateId,
          reason,
          modifiedRegimen: action === 'modify' ? this.modifyText : undefined,
          riskHandling: { uiAcknowledgedAt: new Date().toISOString() }
        })
      } catch (error) {
        if (this.previewMode) {
          this.decisionResult = {
            decisionId: `PREVIEW-DEC-${Date.now()}`,
            action,
            prescriptionDraftId: action === 'reject' ? '' : `PREVIEW-DRAFT-${Date.now()}`,
            draftStatus: action === 'reject' ? 'NO_DRAFT_FOR_REJECTION' : 'SIMULATED_DRAFT_WRITTEN',
            recommendationStatus: 'preview_decided',
            blocked: false
          }
          this.error = ''
        } else {
          this.error = error instanceof Error ? error.message : '审核提交失败'
        }
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
