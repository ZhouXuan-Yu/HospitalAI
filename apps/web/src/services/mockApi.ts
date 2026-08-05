import type { WorklistItem } from './coreApi'
import { previewWorklist } from '../data/previewData'
import evidenceJson from '../data/evidence.json'
import rulesJson from '../data/rules.json'
import integrationJson from '../data/integration.json'
import auditJson from '../data/audit.json'
import patientsJson from '../data/patients.json'
import timelineJson from '../data/timeline.json'
import pharmacistJson from '../data/pharmacist.json'

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

export interface EvidenceDoc {
  id: string
  title: string
  format: string
  type: string
  typeLabel: string
  scope: string
  version: string
  effective: string
  status: string
  statusLabel: string
  statusClass: string
  quality: string
  qualityNote: string
  chunks: number
  updatedAt: string
  updatedBy: string
}

export interface EvidenceChunk {
  section: string
  score: string
  locator: string
  text: string
}

export interface ProcessingStep {
  name: string
  detail: string
  state: 'done' | 'active' | 'pending'
}

export interface RuleItem {
  id: string
  name: string
  scope: string
  severity: string
  severityClass: string
  version: string
  previous: string
  status: string
  statusLabel: string
  statusClass: string
  cases: string
  testAt: string
  evidence: string
  updatedBy: string
  updatedAt: string
}

export interface ConnectorItem {
  id: string
  name: string
  type: string
  icon: string
  status: string
  statusClass: string
  className: string
  mode: string
  lastSuccess: string
  cursor: string
  mapping: string
  metric: string
}

export interface InboundEventItem {
  time: string
  source: string
  batch: string
  type: string
  version: string
  status: string
  className: string
  result: string
  hash: string
}

export interface AuditEventItem {
  id: string
  time: string
  domain: string
  risk: string
  actor: string
  role: string
  action: string
  object: string
  result: string
  resultClass: string
  source: string
  ip: string
  hash: string
  before: string
  after: string
  prevHash: string
  fullHash: string
}

export interface LabItem {
  name: string
  value: string
  unit: string
  trend: number[]
  note: string
  flag: string
}

export interface MedicationItem {
  name: string
  code: string
  status: string
  statusClass: string
  department: string
  route: string
  time: string
  source: string
}

export interface HistoryItem {
  date: string
  title: string
  text: string
  source: string
}

export interface PatientContextPayload {
  patientId: string
  displayName: string
  sex: string
  age: number
  sourcePatientId: string
  encounterId: string
  department: string
  dataVersion: number
  confirmedAllergy: string
  severeAdr: string
  specialPopulation: string
  activeBlocks: string
  labs: LabItem[]
  medications: MedicationItem[]
  history: HistoryItem[]
}

export interface TimelineEvent {
  time: string
  title: string
  detail: string
  source: string
}

export interface TimelineTrack {
  name: string
  trackClass: string
  events: TimelineEvent[]
}

export interface HistoricalEncounterEvent {
  type: string
  icon: string
  title: string
  detail: string
  source: string
  className: string
}

export interface HistoricalEncounter {
  id: string
  date: string
  title: string
  diagnosis: string
  outcome: string
  duration: string
  events: HistoricalEncounterEvent[]
}

export interface TimelinePayload {
  patientId: string
  displayName: string
  detail: string
  legends: Array<{ label: string; color: string }>
  current: {
    date: string
    title: string
    diagnosis: string
    statusLabel: string
    statusClass: string
    daysText: string
    tracks: TimelineTrack[]
  }
  riskLink: { title: string; text: string }
  historical: HistoricalEncounter[]
}

export interface PharmacistReviewItem {
  id: string
  level: string
  levelClass: string
  title: string
  patient: string
  encounter: string
  department: string
  drugs: string
  wait: string
  kind: string
  createdAt: string
  ruleVersion: string
}

export interface PharmacistPayload {
  tabs: Array<{ label: string; value: string; count: number }>
  items: PharmacistReviewItem[]
  communications: Array<{ actor: string; time: string; text: string }>
}

const evidenceData = evidenceJson as unknown as { documents: EvidenceDoc[]; chunks: EvidenceChunk[]; processingSteps: ProcessingStep[] }
const rulesData = rulesJson as unknown as { rules: RuleItem[] }
const integrationData = integrationJson as unknown as { connectors: ConnectorItem[]; events: InboundEventItem[] }
const auditData = auditJson as unknown as { domains: string[]; events: AuditEventItem[] }
const patientsData = patientsJson as unknown as { patients: PatientContextPayload[] }
const timelineData = timelineJson as unknown as { timelines: TimelinePayload[] }
const pharmacistData = pharmacistJson as unknown as PharmacistPayload

export async function mockFetchWorklist(): Promise<WorklistItem[]> {
  await delay()
  return previewWorklist.map(item => ({ ...item }))
}

export async function mockFetchEvidenceDocs(): Promise<EvidenceDoc[]> {
  await delay()
  return evidenceData.documents.map(doc => ({ ...doc }))
}

export async function mockFetchEvidenceChunks(): Promise<EvidenceChunk[]> {
  await delay(150)
  return evidenceData.chunks.map(chunk => ({ ...chunk }))
}

export async function mockFetchEvidenceProcessingSteps(): Promise<ProcessingStep[]> {
  await delay(150)
  return evidenceData.processingSteps.map(step => ({ ...step }))
}

export async function mockFetchRules(): Promise<RuleItem[]> {
  await delay()
  return rulesData.rules.map(rule => ({ ...rule }))
}

export async function mockFetchConnectors(): Promise<ConnectorItem[]> {
  await delay()
  return integrationData.connectors.map(connector => ({ ...connector }))
}

export async function mockFetchInboundEvents(): Promise<InboundEventItem[]> {
  await delay(150)
  return integrationData.events.map(event => ({ ...event }))
}

export async function mockFetchAuditEvents(): Promise<AuditEventItem[]> {
  await delay()
  return auditData.events.map(event => ({ ...event }))
}

export async function mockFetchAuditDomains(): Promise<string[]> {
  await delay(100)
  return [...auditData.domains]
}

export async function mockFetchPatientContext(patientId: string): Promise<PatientContextPayload> {
  await delay()
  const found = patientsData.patients.find(patient => patient.patientId === patientId)
  return { ...(found ?? patientsData.patients[0]) }
}

export async function mockFetchTimeline(patientId: string): Promise<TimelinePayload> {
  await delay()
  const found = timelineData.timelines.find(timeline => timeline.patientId === patientId)
  return { ...(found ?? timelineData.timelines[0]) }
}

export async function mockFetchPharmacistReviews(): Promise<PharmacistPayload> {
  await delay()
  return {
    tabs: pharmacistData.tabs.map(tab => ({ ...tab })),
    items: pharmacistData.items.map(item => ({ ...item })),
    communications: pharmacistData.communications.map(item => ({ ...item }))
  }
}
