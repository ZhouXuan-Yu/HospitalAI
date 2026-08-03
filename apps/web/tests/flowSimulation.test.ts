import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFlowSimulationStore } from '../src/stores/flowSimulation'

const scenarioText = readFileSync(resolve(process.cwd(), 'public/scenarios/cap-full-flow.v1.json'), 'utf8')

describe('frontend flow simulation store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('rejects JSON that does not satisfy the versioned scenario contract', async () => {
    const flow = useFlowSimulationStore()
    await expect(flow.importText('{"schemaVersion":"wrong"}', 'invalid.json')).rejects.toThrow(/不符合/)
    expect(flow.validationErrors.length).toBeGreaterThan(0)
  })

  it('keeps inherited confirmed allergy as a non-bypassable hard block', async () => {
    const flow = useFlowSimulationStore()
    await flow.importText(scenarioText, 'cap-full-flow.v1.json')
    expect(() => flow.recordDecision({
      encounterId: 'E002-2', recommendationId: 'REC-E002-2-v4', action: 'adopt', candidateId: 'C-AMOX',
      finalRegimen: '阿莫西林克拉维酸钾', reason: '尝试绕过'
    })).toThrow(/硬阻断/)
    expect(flow.decisionFor('E002-2')).toBeUndefined()
  })

  it('connects doctor decision, HIS draft callback, outcome and all research stages', async () => {
    const flow = useFlowSimulationStore()
    await flow.importText(scenarioText, 'cap-full-flow.v1.json')

    const decision = flow.recordDecision({
      encounterId: 'E001', recommendationId: 'REC-E001-v3', action: 'adopt', candidateId: 'C-CEF-AZI',
      finalRegimen: '头孢曲松 + 阿奇霉素', reason: '已核对事实、规则与证据'
    })
    expect(decision.draftStatus).toBe('CREATED')
    expect(flow.advanceDraft('E001')).toBe('WRITE_QUEUED')
    expect(flow.advanceDraft('E001')).toBe('HIS_DRAFT_CREATED')
    expect(flow.advanceDraft('E001')).toBe('CALLBACK_CONFIRMED')
    flow.recordOutcome('E001', { actualRegimen: decision.finalRegimen, treatmentResponse: 'improved', adverseEvent: false, followupComplete: true })
    expect(flow.researchRecords.some(record => record.recordId === 'LIVE-E001')).toBe(true)

    flow.saveProtocol()
    flow.buildCohort()
    expect(flow.cohortRecordIds).toContain('LIVE-E001')
    flow.confirmVariables()
    flow.resolveQualityIssue('QI-EXPOSURE-001')
    flow.resolveQualityIssue('QI-FOLLOWUP-001')
    flow.freezeDataset()
    expect(flow.datasetHash).toMatch(/^fnv1a-/)
    await flow.runAnalysis()
    expect(flow.analysisResult?.sampleSize).toBe(6)
    flow.generateReport()
    flow.submitReportReview()
    flow.approveAndFreezeReport()
    flow.submitKnowledge()

    expect(flow.reportStatus).toBe('approved_frozen')
    expect(flow.knowledgeStatus).toBe('review_pending')
    expect(flow.researchProgress).toBe(8)
    expect(flow.auditEvents.some(event => event.action === 'KNOWLEDGE_SUBMITTED')).toBe(true)
  })
})
