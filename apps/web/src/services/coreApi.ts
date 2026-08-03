export interface PatientProfile {
  patientId: string
  displayName: string
  sex: string
  age: number
  source: string
  sourcePatientId: string
}

export interface Encounter {
  encounterId: string
  patientId: string
  department: string
  diagnosis: string
  dataVersion: number
  scenario: string
}

export interface Fact {
  type: string
  label: string
  value: string
  source: string
  sourceId: string
  collectedAt: string
  missingStatus: string
}

export interface SafetyAlert {
  ruleId: string
  version: string
  status: string
  level: 'block' | 'strong' | 'info'
  message: string
  facts: string[]
  blocking: boolean
}

export interface EvidenceSnippet {
  evidenceId: string
  title: string
  status: string
  version: string
  effectiveDate: string
  locator: string
  text: string
  score: number
}

export interface CandidatePlan {
  candidateId: string
  name: string
  drugCodes: string[]
  regimen: string
  reason: string
  difference: string
  risks: string[]
  monitoring: string[]
  evidence: EvidenceSnippet[]
  excludedDrugs: string[]
  blocked: boolean
}

export interface StageState {
  name: string
  status: string
  elapsedMs: number
  detail: string
}

export interface WorkbenchPayload {
  patient: PatientProfile
  encounter: Encounter
  facts: Fact[]
  alerts: SafetyAlert[]
  candidates: CandidatePlan[]
  missingInfo: string[]
  stages: StageState[]
  recommendationId: string
  aiStatus: string
}

export async function fetchWorkbench(encounterId: string): Promise<WorkbenchPayload> {
  const response = await fetch(`/api/workbench/${encounterId}`)
  if (!response.ok) throw new Error(`工作台加载失败：${response.status}`)
  return response.json()
}

export async function submitDecision(recommendationId: string, body: {
  action: string
  candidateId: string
  reason: string
  modifiedRegimen?: string
  riskHandling?: Record<string, unknown>
}) {
  const response = await fetch(`/api/recommendations/${recommendationId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`审核提交失败：${response.status}`)
  return response.json()
}
