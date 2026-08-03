import type { CandidatePlan, WorkbenchPayload, WorklistItem } from '../services/coreApi'

export const previewWorklist: WorklistItem[] = [
  { encounterId: 'E001', patientId: 'P001', displayName: '合成患者A', sex: 'F', age: 66, department: '呼吸内科', diagnosis: '社区获得性肺炎', dataVersion: 3, scenario: 'normal', admittedAt: '2026-08-03T08:10:00Z', sourcePatientId: 'HIS-P001' },
  { encounterId: 'E002-2', patientId: 'P002', displayName: '合成患者B', sex: 'M', age: 72, department: '呼吸内科', diagnosis: '社区获得性肺炎，第二次入院', dataVersion: 4, scenario: 'confirmed_allergy_second_admission', admittedAt: '2026-08-03T07:40:00Z', sourcePatientId: 'HIS-P002' },
  { encounterId: 'E003', patientId: 'P003', displayName: '合成患者C', sex: 'F', age: 59, department: '呼吸内科', diagnosis: '社区获得性肺炎', dataVersion: 2, scenario: 'severe_adr', admittedAt: '2026-08-03T06:55:00Z', sourcePatientId: 'HIS-P003' },
  { encounterId: 'E004', patientId: 'P004', displayName: '合成患者D', sex: 'M', age: 68, department: '呼吸内科', diagnosis: '社区获得性肺炎', dataVersion: 5, scenario: 'cross_department_duplicate_or_conflict', admittedAt: '2026-08-02T22:18:00Z', sourcePatientId: 'HIS-P004' },
  { encounterId: 'E005', patientId: 'P005', displayName: '合成患者E', sex: 'F', age: 81, department: '呼吸内科', diagnosis: '社区获得性肺炎', dataVersion: 1, scenario: 'critical_lab_missing', admittedAt: '2026-08-02T20:36:00Z', sourcePatientId: 'HIS-P005' }
]

const evidence = [
  { evidenceId: 'EV-CAP-001', title: 'CAP 演示证据集：住院成人初始治疗路径', status: 'published-demo', version: '2026.08-demo', effectiveDate: '2026-08-03', locator: '第2页 · 初始方案 · 第3段', text: '演示证据：候选药物必须来自院内目录；存在确认过敏或严重不良反应时，应优先执行确定性安全规则。', score: 0.92 },
  { evidenceId: 'EV-CAP-002', title: 'CAP 演示证据集：监测要求', status: 'published-demo', version: '2026.08-demo', effectiveDate: '2026-08-03', locator: '第4页 · 监测项目 · 表2', text: '演示证据：推荐前需核对过敏史、当前有效用药和关键检验；关键检验缺失时不得按正常值处理。', score: 0.88 }
]

const baseCandidates: CandidatePlan[] = [
  { candidateId: 'C-CEF-AZI', name: '推荐方案', drugCodes: ['D-CEF', 'D-AZI'], regimen: '头孢曲松 + 阿奇霉素，剂量待医生按院内规则表确认', reason: '覆盖 CAP 演示路径，需结合当前检验和跨科室用药复核', difference: '覆盖常见初始路径；存在心律相关风险时需药师复核', risks: [], monitoring: ['过敏史', '肌酐', 'CRP', '当前有效用药'], evidence, excludedDrugs: ['万古霉素：不在当前院内目录可用状态'], blocked: false },
  { candidateId: 'C-AMOX', name: '备选方案', drugCodes: ['D-AMOX'], regimen: '阿莫西林克拉维酸钾，剂量待医生按院内规则表确认', reason: '院内目录备选，需证据和检验完整性支持', difference: '青霉素类方案；确认过敏患者必须硬阻断', risks: [], monitoring: ['过敏史', '肾功能'], evidence, excludedDrugs: [], blocked: false },
  { candidateId: 'C-LEV', name: '特定条件方案', drugCodes: ['D-LEV'], regimen: '左氧氟沙星，剂量待医生按院内规则表确认', reason: '仅作为特定条件下的可比较方案', difference: '喹诺酮类；需要更严格的风险复核', risks: [], monitoring: ['不良反应史', '肾功能', '心电风险'], evidence, excludedDrugs: [], blocked: false }
]

const commonFacts = [
  { type: 'diagnosis', label: '诊断', value: '社区获得性肺炎 / active', source: 'HIS_SIMULATOR', sourceId: 'HIS-DX001', collectedAt: '2026-08-03T08:20:00Z', missingStatus: 'present' },
  { type: 'lab', label: '肌酐', value: '76 umol/L', source: 'LIS_SIMULATOR', sourceId: 'LIS-002', collectedAt: '2026-08-03T08:50:00Z', missingStatus: 'present' },
  { type: 'lab', label: 'C反应蛋白', value: '42 mg/L', source: 'LIS_SIMULATOR', sourceId: 'LIS-001', collectedAt: '2026-08-03T08:50:00Z', missingStatus: 'present' },
  { type: 'medication', label: '当前用药', value: '0.9%氯化钠注射液 · 静脉滴注', source: 'HIS_SIMULATOR', sourceId: 'ORD-001', collectedAt: '2026-08-03T08:35:00Z', missingStatus: 'present' }
]

const stages = [
  { name: 'patient_context', status: 'complete', elapsedMs: 82, detail: '患者事实已汇总，原始事实未被 AI 覆盖' },
  { name: 'deterministic_rules', status: 'complete', elapsedMs: 146, detail: '确定性安全规则已执行，阻断不可绕过' },
  { name: 'controlled_evidence', status: 'complete', elapsedMs: 324, detail: '受控证据检索完成' },
  { name: 'candidate_ranking', status: 'complete', elapsedMs: 418, detail: '目录内候选排序完成' }
]

export function previewWorkbench(encounterId: string): WorkbenchPayload {
  const item = previewWorklist.find(entry => entry.encounterId === encounterId) ?? previewWorklist[0]
  const alerts: WorkbenchPayload['alerts'] = []
  const facts = commonFacts.map(fact => ({ ...fact }))
  const candidates = baseCandidates.map(candidate => ({ ...candidate, risks: [...candidate.risks], monitoring: [...candidate.monitoring], evidence: [...candidate.evidence], excludedDrugs: [...candidate.excludedDrugs] }))
  const missingInfo: string[] = []

  if (item.scenario === 'confirmed_allergy_second_admission') {
    alerts.push({ ruleId: 'HR-ALG-001', version: '2026.08', status: 'published-demo', level: 'block', message: '已确认药物过敏：后续就诊必须继承并阻断 阿莫西林克拉维酸钾', facts: ['ALG-P002-AMOX'], blocking: true })
    facts.push({ type: 'allergy', label: '历史确认过敏', value: '阿莫西林克拉维酸钾 · 确认', source: 'EMR_SIMULATOR', sourceId: 'ALG-P002-AMOX', collectedAt: '2026-03-18T09:30:00Z', missingStatus: 'present' })
    candidates[1].blocked = true
    candidates[1].reason = '命中跨就诊继承的已确认过敏，不能提交'
    candidates[1].risks = ['已确认药物过敏硬阻断']
  }
  if (item.scenario === 'severe_adr') {
    alerts.push({ ruleId: 'HR-ADR-001', version: '2026.08', status: 'published-demo', level: 'strong', message: '医院演示规则：历史严重不良反应需强提醒 左氧氟沙星', facts: ['ADR-P003-LEV'], blocking: false })
    facts.push({ type: 'adr', label: '历史严重不良反应', value: '左氧氟沙星 · 严重 · 已确认', source: 'EMR_SIMULATOR', sourceId: 'ADR-P003-LEV', collectedAt: '2025-12-12T11:20:00Z', missingStatus: 'present' })
    candidates[2].risks = ['历史严重不良反应强提醒']
  }
  if (item.scenario === 'cross_department_duplicate_or_conflict') {
    alerts.push({ ruleId: 'HR-XDEPT-001', version: '2026.08', status: 'published-demo', level: 'strong', message: '跨科室当前有效用药需复核：心内科已有 阿奇霉素', facts: ['ORD-CARD-004'], blocking: false })
    facts.push({ type: 'medication', label: '跨科室当前用药', value: '心内科 · 阿奇霉素 · 当前有效', source: 'HIS_SIMULATOR', sourceId: 'ORD-CARD-004', collectedAt: '2026-08-03T07:05:00Z', missingStatus: 'present' })
    candidates[0].risks = ['存在跨科室当前有效用药提醒']
  }
  if (item.scenario === 'critical_lab_missing') {
    for (const name of ['C反应蛋白', '肌酐']) {
      alerts.push({ ruleId: 'HR-MISS-001', version: '2026.08', status: 'published-demo', level: 'info', message: `关键检验缺失：${name}，不得按正常值处理`, facts: [`MISS-${name}`], blocking: false })
      missingInfo.push(`${name} 缺失，来源 LIS_SIMULATOR`)
    }
    facts.splice(1, 2,
      { type: 'lab', label: '肌酐', value: '未知', source: 'LIS_SIMULATOR', sourceId: 'MISS-肌酐', collectedAt: '2026-08-03T08:50:00Z', missingStatus: 'missing' },
      { type: 'lab', label: 'C反应蛋白', value: '未知', source: 'LIS_SIMULATOR', sourceId: 'MISS-C反应蛋白', collectedAt: '2026-08-03T08:50:00Z', missingStatus: 'missing' }
    )
  }

  return {
    patient: { patientId: item.patientId, displayName: item.displayName, sex: item.sex, age: item.age, source: 'HIS_SIMULATOR', sourcePatientId: item.sourcePatientId },
    encounter: { encounterId: item.encounterId, patientId: item.patientId, department: item.department, diagnosis: item.diagnosis, dataVersion: item.dataVersion, scenario: item.scenario },
    facts,
    alerts,
    candidates,
    missingInfo,
    stages,
    recommendationId: `REC-${item.encounterId}-v${item.dataVersion}`,
    aiStatus: 'deterministic-demo'
  }
}

export const previewAdrReviews = [
  { adrId: 'ADR-REV-003', patientId: 'P003', drugCode: 'D-LEV', drugName: '左氧氟沙星', severity: 'severe', reviewStatus: 'review_pending', sourceId: 'FDB-P003-01', reviewedAt: null },
  { adrId: 'ADR-REV-011', patientId: 'P011', drugCode: 'D-AMOX', drugName: '阿莫西林克拉维酸钾', severity: 'moderate', reviewStatus: 'review_pending', sourceId: 'FDB-P011-02', reviewedAt: null }
]

export const previewKnowledgeSubmissions = [
  { submissionId: 'KS-2026-014', reportId: 'RPT-CAP-006', status: 'review_pending', submissionType: 'research_conclusion', title: 'CAP 住院患者初始方案院内观察结论', submittedBy: '研究负责人·周医生', submittedAt: '2026-08-03T06:20:00Z', publishedAt: null },
  { submissionId: 'KS-2026-013', reportId: 'RPT-ADR-004', status: 'review_pending', submissionType: 'safety_experience', title: '喹诺酮类严重 ADR 风险复核经验', submittedBy: '临床药师·陈药师', submittedAt: '2026-08-02T09:15:00Z', publishedAt: null }
]
