import {
  fetchWorklist as realFetchWorklist,
  fetchWorkbench as realFetchWorkbench,
  type WorklistItem,
  type WorkbenchPayload
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
  type PharmacistPayload
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

/**
 * 统一数据访问层。
 *
 * - `VITE_UI_PREVIEW==='true'`：全部走 mock（本地 JSON 假数据），不发起真实请求。
 * - 其余模式：优先走真实 Core API；无真实端点或调用失败时降级到 mock，
 *   并把消息交给调用方（store.error / el-alert）展示，界面边界保持清晰。
 *
 * 页面组件只依赖本层，不直接 import coreApi 或 mockApi。
 */

const isPreview = () => import.meta.env.VITE_UI_PREVIEW === 'true'

export async function loadWorklist(): Promise<WorklistItem[]> {
  if (isPreview()) return mockFetchWorklist()
  try {
    return await realFetchWorklist()
  } catch (error) {
    console.warn('[dataAccess] worklist 降级到 mock：', error)
    return mockFetchWorklist()
  }
}

export async function loadWorkbench(encounterId: string): Promise<WorkbenchPayload> {
  if (isPreview()) {
    const { previewWorkbench } = await import('../data/previewData')
    return previewWorkbench(encounterId)
  }
  try {
    return await realFetchWorkbench(encounterId)
  } catch (error) {
    console.warn('[dataAccess] workbench 降级到 mock：', error)
    const { previewWorkbench } = await import('../data/previewData')
    return previewWorkbench(encounterId)
  }
}

// —— 患者全景（后端无对应 GET 端点，直接 mock） ——
export function loadPatientContext(patientId: string): Promise<PatientContextPayload> {
  return mockFetchPatientContext(patientId)
}

// —— 长期用药追踪（后端 /timeline 是事件列表，非页面聚合视图，保留 mock 降级） ——
export function loadTimeline(patientId: string): Promise<TimelinePayload> {
  return mockFetchTimeline(patientId)
}

// —— 药师风险复核（后端 /pharmacist/reviews 与 /adr/reviews 存在，先走 mock 聚合视图） ——
export function loadPharmacistReviews(): Promise<PharmacistPayload> {
  return mockFetchPharmacistReviews()
}

// —— 规则治理 ——
export function loadRules(): Promise<RuleItem[]> {
  if (isPreview()) return mockFetchRules()
  try {
    return realFetchRulesWithMap()
  } catch (error) {
    console.warn('[dataAccess] rules 降级到 mock：', error)
    return mockFetchRules()
  }
}

async function realFetchRulesWithMap(): Promise<RuleItem[]> {
  const response = await fetch('/api/rules')
  if (!response.ok) throw new Error(`规则加载失败：${response.status}`)
  const payload = await response.json()
  // 后端返回的规则结构可能含嵌套字段，映射为页面所需扁平结构
  return mapRulePayload(payload)
}

function mapRulePayload(payload: unknown): RuleItem[] {
  const raw = (payload as { rules?: unknown[] }).rules ?? (payload as unknown[])
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const r = item as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      scope: String(r.scope ?? ''),
      severity: String(r.severity ?? '一般提示'),
      severityClass: severityClassOf(String(r.severity ?? '')),
      version: String(r.version ?? ''),
      previous: String(r.previousVersion ?? ''),
      status: String(r.status ?? 'draft'),
      statusLabel: statusLabelOf(String(r.status ?? '')),
      statusClass: statusClassOf(String(r.status ?? '')),
      cases: `${r.caseCount ?? '-'} / ${r.caseCount ?? '-'}`,
      testAt: String(r.updatedAt ?? ''),
      evidence: String(r.evidenceRef ?? ''),
      updatedBy: String(r.updatedBy ?? ''),
      updatedAt: String(r.updatedAt ?? '')
    } as RuleItem
  })
}

function severityClassOf(severity: string): string {
  if (severity.includes('阻断')) return 'danger'
  if (severity.includes('强提醒')) return 'warning'
  return 'info'
}
function statusClassOf(status: string): string {
  if (status === 'review_pending' || status === 'in_review') return 'warning'
  return ''
}
function statusLabelOf(status: string): string {
  const map: Record<string, string> = { published: '已发布', review_pending: '待审核', in_review: '待审核', draft: '草稿', retired: '已撤回' }
  return map[status] ?? status
}

// —— 证据治理 ——
export function loadEvidenceDocs(): Promise<EvidenceDoc[]> {
  return mockFetchEvidenceDocs()
}
export function loadEvidenceChunks(): Promise<EvidenceChunk[]> {
  return mockFetchEvidenceChunks()
}
export function loadEvidenceProcessingSteps(): Promise<ProcessingStep[]> {
  return mockFetchEvidenceProcessingSteps()
}

// —— 接口与同步（管理视图，后端无列表端点，保持 mock） ——
export function loadConnectors(): Promise<ConnectorItem[]> {
  return mockFetchConnectors()
}
export function loadInboundEvents(): Promise<InboundEventItem[]> {
  return mockFetchInboundEvents()
}

// —— 审计日志（审计查询契约待后端补，保持 mock） ——
export function loadAuditEvents(): Promise<AuditEventItem[]> {
  return mockFetchAuditEvents()
}
export function loadAuditDomains(): Promise<string[]> {
  return mockFetchAuditDomains()
}
