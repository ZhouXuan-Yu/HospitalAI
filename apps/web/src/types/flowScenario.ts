import type { WorkbenchPayload, WorklistItem } from '../services/coreApi'

export interface ScenarioMetadata {
  scenarioId: string
  name: string
  version: string
  generatedAt: string
  source: string
  synthetic: boolean
  disclaimer: string
}

export interface ResearchRecord {
  recordId: string
  patientId: string
  encounterId: string
  age: number
  sex: string
  diagnosis: string
  admittedAt: string
  regimen: string
  treatmentResponse: 'improved' | 'stable' | 'worsened' | 'unknown'
  adverseEvent: boolean
  followupComplete: boolean
  sourceVersion: string
}

export interface ResearchVariable {
  code: string
  name: string
  role: 'exposure' | 'outcome' | 'group' | 'confounder'
  type: 'string' | 'number' | 'boolean' | 'date'
  sourcePath: string
  missingRule: string
}

export interface ResearchQualityIssue {
  issueId: string
  severity: 'blocking' | 'warning'
  title: string
  field: string
  affectedRecords: number
  resolution: string
}

export interface ResearchSeed {
  project: {
    projectId: string
    title: string
    owner: string
    protocolVersion: string
    researchQuestion: string
    design: string
    inclusionCriteria: string[]
    exclusionCriteria: string[]
    observationWindow: string
    ethicsStatus: string
  }
  historicalRecords: ResearchRecord[]
  variables: ResearchVariable[]
  qualityIssues: ResearchQualityIssue[]
  analysisPlan: {
    scriptName: string
    scriptVersion: string
    method: string
    outputs: string[]
  }
  publicationProfile: {
    institution: string
    principalInvestigator: string
    statistician: string
    ethicsApproval: string
    registrationId: string
    targetJournal: string
    primaryEndpoint: string
    secondaryEndpoints: string[]
    exposureDefinition: string
    confounders: string[]
    statisticalSoftware: string
    reportingGuideline: string
  }
  reportTemplate: {
    title: string
    limitations: string[]
    applicability: string
  }
}

export interface FlowScenario {
  schemaVersion: 'hospitalai.frontend-flow.v1'
  metadata: ScenarioMetadata
  worklist: WorklistItem[]
  workbenches: WorkbenchPayload[]
  research: ResearchSeed
}

export type DraftStatus = 'CREATED' | 'WRITE_QUEUED' | 'HIS_DRAFT_CREATED' | 'CALLBACK_CONFIRMED'

export interface SimulatedDecision {
  decisionId: string
  encounterId: string
  patientId: string
  recommendationId: string
  action: 'adopt' | 'modify' | 'reject'
  candidateId: string
  finalRegimen: string
  reason: string
  decidedAt: string
  draftId: string
  draftStatus: DraftStatus | 'NO_DRAFT_FOR_REJECTION'
}

export interface OutcomeRecord {
  encounterId: string
  actualRegimen: string
  treatmentResponse: ResearchRecord['treatmentResponse']
  adverseEvent: boolean
  followupComplete: boolean
  recordedAt: string
}

export interface AnalysisResult {
  runId: string
  datasetVersion: string
  inputHash: string
  outputHash: string
  sampleSize: number
  improvedCount: number
  adverseEventCount: number
  followupMissingCount: number
  regimenDistribution: Array<{ regimen: string; count: number }>
  regimenOutcomes: Array<{
    regimen: string
    sampleSize: number
    meanAge: number
    femaleCount: number
    improvedCount: number
    adverseEventCount: number
    followupCompleteCount: number
  }>
  subgroupOutcomes: Array<{
    subgroup: 'age_group' | 'sex'
    level: string
    regimen: string
    sampleSize: number
    improvedCount: number
    adverseEventCount: number
  }>
  generatedAt: string
}

export interface FlowAuditEvent {
  eventId: string
  category: 'scenario' | 'decision' | 'draft' | 'outcome' | 'research' | 'knowledge'
  action: string
  detail: string
  occurredAt: string
}
