import { defineStore } from 'pinia'
import { fetchWorkbench, fetchWorklist, submitDecision, type CandidatePlan, type WorkbenchPayload, type WorklistItem } from '../services/coreApi'

export const useWorkbenchStore = defineStore('workbench', {
  state: () => ({
    payload: null as WorkbenchPayload | null,
    worklist: [] as WorklistItem[],
    loading: false,
    error: '',
    selectedCandidateId: '',
    decisionResult: null as null | Record<string, unknown>,
    modifyText: ''
  }),
  getters: {
    selectedCandidate(state): CandidatePlan | undefined {
      return state.payload?.candidates.find(candidate => candidate.candidateId === state.selectedCandidateId)
    },
    hasBlockingRisk(state): boolean {
      return Boolean(state.payload?.alerts.some(alert => alert.blocking))
    }
  },
  actions: {
    async loadWorklist() {
      this.error = ''
      try {
        this.worklist = await fetchWorklist()
      } catch (error) {
        this.error = error instanceof Error ? error.message : '未知错误'
      }
    },
    async load(encounterId: string) {
      this.loading = true
      this.error = ''
      this.decisionResult = null
      try {
        this.payload = await fetchWorkbench(encounterId)
        this.selectedCandidateId = this.payload.candidates[0]?.candidateId ?? ''
        this.modifyText = this.payload.candidates[0]?.regimen ?? ''
      } catch (error) {
        this.error = error instanceof Error ? error.message : '未知错误'
      } finally {
        this.loading = false
      }
    },
    async decide(action: 'adopt' | 'modify' | 'reject', reason: string) {
      if (!this.payload || !this.selectedCandidateId) return
      this.decisionResult = await submitDecision(this.payload.recommendationId, {
        action,
        candidateId: this.selectedCandidateId,
        reason,
        modifiedRegimen: action === 'modify' ? this.modifyText : undefined,
        riskHandling: { uiAcknowledgedAt: new Date().toISOString() }
      })
    }
  }
})
