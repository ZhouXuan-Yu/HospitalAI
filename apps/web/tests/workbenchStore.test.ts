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
})
