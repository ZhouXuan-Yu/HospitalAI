import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkbenchStore } from '../src/stores/workbench'

describe('workbench store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('marks blocking allergy payload as not submittable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        recommendationId: 'REC-E002-2-v4',
        patient: { patientId: 'P002', displayName: '合成患者B', sex: 'M', age: 72, source: 'HIS_SIMULATOR', sourcePatientId: 'HIS-P002' },
        encounter: { encounterId: 'E002-2', patientId: 'P002', department: '呼吸内科', diagnosis: '社区获得性肺炎', dataVersion: 4, scenario: 'confirmed_allergy_second_admission' },
        facts: [],
        alerts: [{ ruleId: 'HR-ALG-001', version: '2026.08', status: 'published-demo', level: 'block', message: '已确认药物过敏', facts: [], blocking: true }],
        candidates: [{ candidateId: 'C-AMOX', name: '备选方案', drugCodes: ['D-AMOX'], regimen: '阿莫西林', reason: '', difference: '', risks: [], monitoring: [], evidence: [], excludedDrugs: [], blocked: true }],
        missingInfo: [],
        stages: [],
        aiStatus: 'deterministic-demo'
      })
    })))
    const store = useWorkbenchStore()
    await store.load('E002-2')
    expect(store.hasBlockingRisk).toBe(true)
    expect(store.selectedCandidate?.blocked).toBe(true)
  })

  it('loads operational queues and refreshes workbench after ADR resolution', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/adr/reviews/ADR-1/resolve')) {
        return { ok: true, json: async () => ({ adrId: 'ADR-1', reviewStatus: 'reviewed' }) }
      }
      if (url.startsWith('/api/adr/reviews')) {
        return { ok: true, json: async () => ([{ adrId: 'ADR-1', patientId: 'P001', drugCode: 'D-LEV', drugName: '左氧氟沙星', severity: 'severe', reviewStatus: 'review_pending', sourceId: 'FDB-1', reviewedAt: null }]) }
      }
      if (url.startsWith('/api/knowledge/submissions')) {
        return { ok: true, json: async () => [] }
      }
      if (url.startsWith('/api/workbench/E001')) {
        return {
          ok: true,
          json: async () => ({
            recommendationId: 'REC-E001-v1',
            patient: { patientId: 'P001', displayName: '合成患者A', sex: 'F', age: 66, source: 'HIS_SIMULATOR', sourcePatientId: 'HIS-P001' },
            encounter: { encounterId: 'E001', patientId: 'P001', department: '呼吸内科', diagnosis: '社区获得性肺炎', dataVersion: 1, scenario: 'normal' },
            facts: [],
            alerts: [{ ruleId: 'HR-ADR-001', version: '2026.08', status: 'published-demo', level: 'strong', message: '严重不良反应强提醒', facts: ['FDB-1'], blocking: false }],
            candidates: [{ candidateId: 'C-LEV', name: '特定条件方案', drugCodes: ['D-LEV'], regimen: '左氧氟沙星', reason: '', difference: '', risks: [], monitoring: [], evidence: [], excludedDrugs: [], blocked: false }],
            missingInfo: [],
            stages: [],
            aiStatus: 'deterministic-demo'
          })
        }
      }
      return { ok: true, json: async () => [] }
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = useWorkbenchStore()
    await store.load('E001')
    await store.loadOps()
    expect(store.adrReviews[0].adrId).toBe('ADR-1')

    await store.resolveAdr('ADR-1', 'confirm')
    expect(store.opsResult).toContain('reviewed')
    expect(store.payload?.alerts[0].ruleId).toBe('HR-ADR-001')
  })
})
