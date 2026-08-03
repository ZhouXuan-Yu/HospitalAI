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

export interface WorklistItem {
  encounterId: string
  patientId: string
  displayName: string
  sex: string
  age: number
  department: string
  diagnosis: string
  dataVersion: number
  scenario: string
  admittedAt: string
  sourcePatientId: string
}

export interface AdverseDrugReactionSummary {
  adrId: string
  patientId: string
  drugCode: string
  drugName: string
  severity: string
  reviewStatus: string
  sourceId: string
  reviewedAt: string | null
}

export interface KnowledgeSubmissionSummary {
  submissionId: string
  reportId: string
  status: string
  submissionType: string
  title: string
  submittedBy: string
  submittedAt: string
  publishedAt: string | null
}

export interface ResearchAnalysisTaskSummary {
  taskId: string
  cohortId: string
  status: string
  scriptVersion: string
  statisticPlan: string
  attemptCount: number
  nextAttemptAt: string
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface ResearchArtifactContent {
  artifactUri: string
  sha256: string
  content: string
}

const roleHeaders = (role: string) => ({ 'X-HospitalAI-Role': role })
const jsonRoleHeaders = (role: string) => ({ 'Content-Type': 'application/json', 'X-HospitalAI-Role': role })

export interface SnapshotImportResponse {
  eventId: string
  status: string
  schemaVersion: string
  patientsUpserted: number
  encountersUpserted: number
  catalogItemsUpserted: number
  mappingsUpserted: number
  warnings: string[]
}

export async function fetchWorklist(): Promise<WorklistItem[]> {
  const response = await fetch('/api/worklist')
  if (!response.ok) throw new Error(`患者工作列表加载失败：${response.status}`)
  return response.json()
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
}): Promise<{
  decisionId: string
  action: string
  prescriptionDraftId: string
  draftStatus: string
  recommendationStatus: string
  pharmacistReviewId: string
  auditEvents: string[]
  blocked: boolean
}> {
  const response = await fetch(`/api/recommendations/${recommendationId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`审核提交失败：${response.status}`)
  return response.json()
}

export async function fetchAdrReviews(status = 'review_pending'): Promise<AdverseDrugReactionSummary[]> {
  const response = await fetch(`/api/adr/reviews?status=${encodeURIComponent(status)}`)
  if (!response.ok) throw new Error(`ADR审核队列加载失败：${response.status}`)
  return response.json()
}

export async function resolveAdrReview(adrId: string, decision: 'confirm' | 'reject', note: string): Promise<AdverseDrugReactionSummary> {
  const response = await fetch(`/api/adr/reviews/${adrId}/resolve`, {
    method: 'POST',
    headers: jsonRoleHeaders('pharmacist'),
    body: JSON.stringify({ decision, note })
  })
  if (!response.ok) throw new Error(`ADR审核提交失败：${response.status}`)
  return response.json()
}

export async function fetchKnowledgeSubmissions(status = 'review_pending'): Promise<KnowledgeSubmissionSummary[]> {
  const response = await fetch(`/api/knowledge/submissions?status=${encodeURIComponent(status)}`)
  if (!response.ok) throw new Error(`知识审核队列加载失败：${response.status}`)
  return response.json()
}

export async function reviewKnowledgeSubmission(submissionId: string, reviewerRole: string, decision: 'approve' | 'reject', note: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/knowledge/submissions/${submissionId}/reviews`, {
    method: 'POST',
    headers: jsonRoleHeaders(reviewerRole),
    body: JSON.stringify({ reviewerRole, decision, note })
  })
  if (!response.ok) throw new Error(`知识审核提交失败：${response.status}`)
  return response.json()
}

export async function processNextAnalysisTask(): Promise<Record<string, unknown>> {
  const response = await fetch('/api/research/analysis-tasks/process-next', { method: 'POST', headers: roleHeaders('worker') })
  if (!response.ok) throw new Error(`科研统计任务处理失败：${response.status}`)
  return response.json()
}

export async function fetchAnalysisTasks(cohortId: string, status = ''): Promise<ResearchAnalysisTaskSummary[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await fetch(`/api/research/cohorts/${cohortId}/analysis-tasks${query}`)
  if (!response.ok) throw new Error(`科研统计任务加载失败：${response.status}`)
  return response.json()
}

export async function fetchResearchArtifact(uri: string): Promise<ResearchArtifactContent> {
  const response = await fetch(`/api/research/artifacts?uri=${encodeURIComponent(uri)}`, { headers: roleHeaders('researcher') })
  if (!response.ok) throw new Error(`科研产物读取失败：${response.status}`)
  return response.json()
}
