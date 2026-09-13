import {
  fetchWorklist as realFetchWorklist,
  fetchWorkbench as realFetchWorkbench,
  fetchPharmacistReviews as realFetchPharmacistReviews,
  resolvePharmacistReview as realResolvePharmacistReview,
  fetchCollaborationTasks as realFetchCollaborationTasks,
  resolveCollaborationTask as realResolveCollaborationTask,
  fetchKnowledgeSubmissions as realFetchKnowledgeSubmissions,
  reviewKnowledgeSubmission as realReviewKnowledgeSubmission,
  type WorklistItem,
  type WorkbenchPayload,
  type PharmacistReviewTaskSummary,
  type CollaborationTaskSummary,
  type KnowledgeSubmissionSummary
} from './coreApi'
import {
  mockFetchWorklist,
  mockFetchEvidenceDocs,
  mockFetchEvidenceChunks,
  mockFetchEvidenceProcessingSteps,
  mockFetchRules,
  mockFetchConnectors,
  mockFetchInboundEvents,
  mockFetchAuditEvents,
  mockFetchAuditDomains,
  mockFetchPatientContext,
  mockFetchTimeline,
  mockFetchPharmacistReviews,
  type EvidenceDoc,
  type EvidenceChunk,
  type ProcessingStep,
  type RuleItem,
  type ConnectorItem,
  type InboundEventItem,
  type AuditEventItem,
  type PatientContextPayload,
  type TimelinePayload,
  type PharmacistPayload,
  type PharmacistReviewItem
} from './mockApi'

export type {
  EvidenceDoc,
  EvidenceChunk,
  ProcessingStep,
  RuleItem,
  ConnectorItem,
  InboundEventItem,
  AuditEventItem,
  PatientContextPayload,
  TimelinePayload,
  PharmacistPayload,
  PharmacistReviewItem
} from './mockApi'
export type { WorklistItem, WorkbenchPayload } from './coreApi'
export type { PharmacistReviewTaskSummary, CollaborationTaskSummary, KnowledgeSubmissionSummary, AdverseDrugReactionSummary } from './coreApi'

const isPreview = () => import.meta.env.VITE_UI_PREVIEW === 'true'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`接口请求失败 ${response.status}: ${path}`)
  return response.json() as Promise<T>
}

function unavailable(name: string): never {
  throw new Error(`生产接口未实现：${name}。请先完成 Core API 契约，不会使用本地假数据替代。`)
}

export async function loadWorklist(): Promise<WorklistItem[]> {
  return isPreview() ? mockFetchWorklist() : realFetchWorklist()
}

export async function loadWorkbench(encounterId: string): Promise<WorkbenchPayload> {
  if (isPreview()) {
    const { previewWorkbench } = await import('../data/previewData')
    return previewWorkbench(encounterId)
  }
  return realFetchWorkbench(encounterId)
}

export function loadPatientContext(patientId: string): Promise<PatientContextPayload> {
  if (isPreview()) return mockFetchPatientContext(patientId)
  return getJson<PatientContextPayload>(`/api/patients/${encodeURIComponent(patientId)}/context`)
}

export function loadTimeline(patientId: string): Promise<TimelinePayload> {
  if (isPreview()) return mockFetchTimeline(patientId)
  return getJson<TimelinePayload>(`/api/patients/${encodeURIComponent(patientId)}/timeline`)
}

export async function loadPharmacistReviews(): Promise<PharmacistPayload> {
  if (isPreview()) return mockFetchPharmacistReviews()
  return mapPharmacistReviewsToPayload(await realFetchPharmacistReviews('pending'))
}

function mapPharmacistReviewsToPayload(reviews: PharmacistReviewTaskSummary[]): PharmacistPayload {
  return {
    tabs: [
      { label: '待处理', value: 'pending', count: reviews.length },
      { label: '沟通中', value: 'active', count: 0 },
      { label: '我已处理', value: 'done', count: 0 }
    ],
    items: reviews.map((review) => ({
      id: review.reviewId,
      level: priorityLabel(review.priority),
      levelClass: priorityClass(review.priority),
      title: `${review.diagnosis || ''} 用药复核`,
      patient: review.patientName || review.patientId || '',
      encounter: review.encounterId,
      department: review.department || '',
      drugs: review.drugNames?.join(' · ') || review.reason,
      wait: '待处理',
      kind: '处方复核',
      createdAt: review.createdAt,
      ruleVersion: review.reason,
      reason: review.reason
    })),
    communications: []
  }
}

function priorityLabel(priority: string): string {
  if (priority === 'high' || priority === 'urgent' || priority === 'severe') return '高优先级'
  if (priority === 'strong' || priority === 'warning') return '强提醒'
  return '一般'
}

function priorityClass(priority: string): string {
  if (priority === 'high' || priority === 'urgent' || priority === 'severe') return 'danger'
  if (priority === 'strong' || priority === 'warning') return 'warning'
  return 'info'
}

export async function resolvePharmacistReview(reviewId: string, resolution: string): Promise<Record<string, unknown>> {
  if (isPreview()) return { reviewId, status: 'resolved', preview: true }
  return realResolvePharmacistReview(reviewId, resolution)
}

export async function loadCollaborationTasks(status = 'pending'): Promise<CollaborationTaskSummary[]> {
  if (isPreview()) return []
  return realFetchCollaborationTasks(status)
}

export async function resolveCollaborationTask(taskId: string, resolution: string): Promise<Record<string, unknown>> {
  if (isPreview()) return { taskId, status: 'resolved', preview: true }
  return realResolveCollaborationTask(taskId, resolution)
}

export async function loadKnowledgeSubmissions(status = 'review_pending'): Promise<KnowledgeSubmissionSummary[]> {
  if (isPreview()) return []
  return realFetchKnowledgeSubmissions(status)
}

export async function submitKnowledgeReview(submissionId: string, reviewerRole: string, decision: 'approve' | 'reject', note: string): Promise<Record<string, unknown>> {
  if (isPreview()) return { submissionId, reviewerRole, decision, preview: true }
  return realReviewKnowledgeSubmission(submissionId, reviewerRole, decision, note)
}

export async function loadRules(): Promise<RuleItem[]> {
  if (isPreview()) return mockFetchRules()
  return mapRulePayload(await getJson<unknown>('/api/rules'))
}

function mapRulePayload(payload: unknown): RuleItem[] {
  const value = payload as { rules?: unknown[] } | unknown[]
  const raw = Array.isArray(value) ? value : value.rules ?? []
  return raw.map((item) => {
    const rule = item as Record<string, unknown>
    const severity = String(rule.severity ?? '一般提示')
    const status = String(rule.status ?? 'draft')
    return {
      id: String(rule.id ?? ''), name: String(rule.name ?? ''), scope: String(rule.scope ?? ''), severity,
      severityClass: severityClassOf(severity), version: String(rule.version ?? ''), previous: String(rule.previousVersion ?? ''),
      status, statusLabel: statusLabelOf(status), statusClass: statusClassOf(status), cases: `${rule.caseCount ?? '-'} / ${rule.caseCount ?? '-'}`,
      testAt: String(rule.updatedAt ?? ''), evidence: String(rule.evidenceRef ?? ''), updatedBy: String(rule.updatedBy ?? ''), updatedAt: String(rule.updatedAt ?? '')
    } satisfies RuleItem
  })
}

function severityClassOf(severity: string): string {
  if (severity.includes('阻断')) return 'danger'
  if (severity.includes('强提醒')) return 'warning'
  return 'info'
}

function statusClassOf(status: string): string {
  return status === 'review_pending' || status === 'in_review' ? 'warning' : ''
}

function statusLabelOf(status: string): string {
  const labels: Record<string, string> = { published: '已发布', review_pending: '待审核', in_review: '待审核', draft: '草稿', retired: '已撤回' }
  return labels[status] ?? status
}

export function loadEvidenceDocs(): Promise<EvidenceDoc[]> {
  if (isPreview()) return mockFetchEvidenceDocs()
  return getJson<EvidenceDoc[]>('/api/evidence/documents')
}

export function loadEvidenceChunks(): Promise<EvidenceChunk[]> {
  if (isPreview()) return mockFetchEvidenceChunks()
  return getJson<EvidenceChunk[]>('/api/evidence/chunks')
}

export function loadEvidenceProcessingSteps(): Promise<ProcessingStep[]> {
  if (isPreview()) return mockFetchEvidenceProcessingSteps()
  return unavailable('GET /api/evidence/documents/{evidenceId}/processing-steps')
}

export function loadConnectors(): Promise<ConnectorItem[]> {
  if (isPreview()) return mockFetchConnectors()
  return unavailable('GET /api/integration/connectors')
}

export function loadInboundEvents(): Promise<InboundEventItem[]> {
  if (isPreview()) return mockFetchInboundEvents()
  return unavailable('GET /api/integration/events')
}

export function loadAuditEvents(): Promise<AuditEventItem[]> {
  if (isPreview()) return mockFetchAuditEvents()
  return unavailable('GET /api/audit/events')
}

export function loadAuditDomains(): Promise<string[]> {
  if (isPreview()) return mockFetchAuditDomains()
  return unavailable('GET /api/audit/domains')
}
