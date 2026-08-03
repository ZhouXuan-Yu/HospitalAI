import JSZip from 'jszip'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx'
import type { AnalysisResult, FlowAuditEvent, ResearchRecord, ResearchSeed } from '../types/flowScenario'

export interface ResearchArtifactInput {
  seed: ResearchSeed
  records: ResearchRecord[]
  excludedRecords: ResearchRecord[]
  resolvedQualityIssueIds: string[]
  analysis: AnalysisResult
  datasetVersion: string
  datasetHash: string
  reportVersion: string
  reportSections: Record<string, string>
  auditEvents: FlowAuditEvent[]
  synthetic: boolean
  scenarioDisclaimer: string
}

export interface ResearchArtifactBundle {
  zip: Blob
  report: Blob
  zipName: string
  reportName: string
  manifest: Record<string, unknown>
}

const csvCell = (value: unknown) => {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
const toCsv = (headers: string[], rows: unknown[][]) => `\uFEFF${headers.map(csvCell).join(',')}\r\n${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`
const percent = (count: number, total: number) => total ? `${((count / total) * 100).toFixed(1)}%` : 'NA'
const safeFileName = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')

async function sha256(value: string | Blob) {
  const bytes = value instanceof Blob ? await new Response(value).arrayBuffer() : new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function paragraphs(text: string) {
  return text.split('\n').filter(Boolean).map(line => new Paragraph({ children: [new TextRun(line)] }))
}

function heading(text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } })
}

function resultTable(input: ResearchArtifactInput) {
  const header = ['用药暴露方案', 'n', '平均年龄', '女性', '改善', '不良事件', '随访完整']
  const rows = input.analysis.regimenOutcomes.map(item => [
    item.regimen,
    String(item.sampleSize),
    String(item.meanAge),
    `${item.femaleCount} (${percent(item.femaleCount, item.sampleSize)})`,
    `${item.improvedCount} (${percent(item.improvedCount, item.sampleSize)})`,
    `${item.adverseEventCount} (${percent(item.adverseEventCount, item.sampleSize)})`,
    `${item.followupCompleteCount} (${percent(item.followupCompleteCount, item.sampleSize)})`
  ])
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows].map((row, index) => new TableRow({
      children: row.map(value => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold: index === 0 })] })] }))
    }))
  })
}

function subgroupTable(input: ResearchArtifactInput) {
  const header = ['分层变量', '层级', '用药暴露方案', 'n', '改善', '不良事件']
  const rows = input.analysis.subgroupOutcomes.map(item => [
    item.subgroup === 'age_group' ? '年龄组' : '性别', item.level, item.regimen, String(item.sampleSize),
    `${item.improvedCount} (${percent(item.improvedCount, item.sampleSize)})`,
    `${item.adverseEventCount} (${percent(item.adverseEventCount, item.sampleSize)})`
  ])
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows].map((row, index) => new TableRow({
      children: row.map(value => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold: index === 0 })] })] }))
    }))
  })
}

async function buildReport(input: ResearchArtifactInput) {
  const { project, publicationProfile: publication } = input.seed
  const disclaimer = input.synthetic
    ? '重要声明：本报告基于合成验证数据，仅用于验证科研数据治理、统计与报告流程，不得作为论文投稿数据、临床证据或个体化用药依据。'
    : '重要声明：该报告仍须完成伦理、统计、临床和科研管理审核后方可用于投稿。'
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: input.seed.reportTemplate.title, bold: true, size: 34 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`${publication.institution} · ${input.reportVersion}`)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`主要研究者：${publication.principalInvestigator}　统计负责人：${publication.statistician}`)] }),
    new Paragraph({ spacing: { before: 240, after: 240 }, children: [new TextRun({ text: disclaimer, bold: true, color: '9C2F2F' })] }),
    heading('摘要'), ...paragraphs(input.reportSections.abstract ?? ''),
    heading('1. 研究背景与问题'), ...paragraphs(input.reportSections.question ?? ''),
    heading('2. 研究设计与方法'),
    ...paragraphs(`研究设计：${project.design}\n观察时间窗：${project.observationWindow}\n主要终点：${publication.primaryEndpoint}\n次要终点：${publication.secondaryEndpoints.join('；')}\n暴露定义：${publication.exposureDefinition}\n预设混杂因素：${publication.confounders.join('、')}\n统计方法：${input.seed.analysisPlan.method}\n统计软件：${publication.statisticalSoftware}\n报告规范：${publication.reportingGuideline}`),
    heading('2.1 纳入标准', HeadingLevel.HEADING_2), ...project.inclusionCriteria.map((item, index) => new Paragraph({ text: `${index + 1}. ${item}` })),
    heading('2.2 排除标准', HeadingLevel.HEADING_2), ...project.exclusionCriteria.map((item, index) => new Paragraph({ text: `${index + 1}. ${item}` })),
    heading('2.3 伦理与注册', HeadingLevel.HEADING_2), ...paragraphs(`伦理状态：${publication.ethicsApproval}\n注册标识：${publication.registrationId}\n目标期刊：${publication.targetJournal}`),
    heading('3. 数据集与质量控制'), ...paragraphs(`冻结数据集：${input.datasetVersion}\n输入哈希：${input.datasetHash}\n纳入记录：${input.records.length}\n排除记录：${input.excludedRecords.length}\n已处理质量问题：${input.resolvedQualityIssueIds.length}/${input.seed.qualityIssues.length}`),
    heading('4. 结果'), ...paragraphs(input.reportSections.outcomes ?? ''),
    heading('表 1. 不同用药暴露方案的描述性结果', HeadingLevel.HEADING_2), resultTable(input),
    heading('表 2. 年龄与性别分层的未经调整结果', HeadingLevel.HEADING_2), subgroupTable(input),
    new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: '注：分层结果未经混杂调整，样本稀疏时比例极不稳定，只能用于假设生成。', italics: true })] }),
    heading('5. 讨论与临床解释边界'), ...paragraphs(input.reportSections.subgroups ?? ''),
    heading('6. 偏倚、缺失与局限'), ...paragraphs(input.reportSections.limitations ?? ''),
    heading('7. 结论'), ...paragraphs(input.reportSections.conclusion ?? ''),
    heading('8. 数据可用性与可复现性'), ...paragraphs(`${input.reportSections.reproducibility ?? ''}\n统计输出哈希：${input.analysis.outputHash}\n压缩包内含去标识分析数据、变量字典、纳排日志、质量记录、统计结果、审计轨迹与清单。`),
    heading('9. 投稿前强制审核项'),
    ...['伦理批件与研究注册真实有效', '数据来自经授权的真实研究队列并完成脱敏', '统计分析计划在看见结果前锁定', '样本量估算、混杂控制和敏感性分析完成', '临床、药学、统计与科研管理多角色签字', '按目标期刊要求完成 STROBE 清单与数据可用性声明'].map(item => new Paragraph({ text: `□ ${item}` }))
  ]
  return Packer.toBlob(new Document({ sections: [{ properties: {}, children }] }))
}

export async function buildResearchArtifactBundle(input: ResearchArtifactInput): Promise<ResearchArtifactBundle> {
  const report = await buildReport(input)
  const files: Record<string, string | Blob> = {
    'README.md': `# ${input.seed.project.title}\n\n${input.scenarioDisclaimer}\n\n该数据包与报告版本一一绑定。合成数据不得用于论文投稿或临床结论。\n`,
    'metadata/protocol.json': JSON.stringify({ project: input.seed.project, publicationProfile: input.seed.publicationProfile }, null, 2),
    'metadata/analysis-plan.json': JSON.stringify(input.seed.analysisPlan, null, 2),
    'data/analysis-dataset.csv': toCsv(['record_id', 'age', 'sex', 'diagnosis', 'admitted_at', 'regimen_exposure', 'treatment_response', 'adverse_event', 'followup_complete', 'source_version'], input.records.map(record => [record.recordId, record.age, record.sex, record.diagnosis, record.admittedAt, record.regimen, record.treatmentResponse, record.adverseEvent, record.followupComplete, record.sourceVersion])),
    'data/variable-dictionary.csv': toCsv(['code', 'name', 'role', 'type', 'source_path', 'missing_rule'], input.seed.variables.map(variable => [variable.code, variable.name, variable.role, variable.type, variable.sourcePath, variable.missingRule])),
    'data/inclusion-log.csv': toCsv(['record_id', 'status', 'reason'], [...input.records.map(record => [record.recordId, 'included', '符合冻结方案纳入标准']), ...input.excludedRecords.map(record => [record.recordId, 'excluded', '不符合冻结方案纳排条件'])]),
    'quality/quality-issues.csv': toCsv(['issue_id', 'severity', 'title', 'field', 'affected_records', 'resolution', 'status'], input.seed.qualityIssues.map(issue => [issue.issueId, issue.severity, issue.title, issue.field, issue.affectedRecords, issue.resolution, input.resolvedQualityIssueIds.includes(issue.issueId) ? 'resolved' : 'open'])),
    'analysis/result.json': JSON.stringify(input.analysis, null, 2),
    'analysis/reproducibility.md': `# 复现说明\n\n- 数据集：${input.datasetVersion}\n- 输入哈希：${input.datasetHash}\n- 运行标识：${input.analysis.runId}\n- 输出哈希：${input.analysis.outputHash}\n- 脚本：${input.seed.analysisPlan.scriptName} ${input.seed.analysisPlan.scriptVersion}\n- 软件：${input.seed.publicationProfile.statisticalSoftware}\n`,
    'audit/flow-audit.json': JSON.stringify(input.auditEvents.filter(event => event.category === 'research' || event.category === 'knowledge'), null, 2),
    [`report/${input.reportVersion}.docx`]: report
  }
  const entries = []
  for (const [path, content] of Object.entries(files)) entries.push({ path, sha256: await sha256(content), bytes: content instanceof Blob ? content.size : new TextEncoder().encode(content).byteLength })
  const manifest = { schemaVersion: 'hospitalai.research-package.v1', generatedAt: input.analysis.generatedAt, synthetic: input.synthetic, datasetVersion: input.datasetVersion, datasetHash: input.datasetHash, analysisRunId: input.analysis.runId, analysisOutputHash: input.analysis.outputHash, reportVersion: input.reportVersion, files: entries }
  files['manifest.json'] = JSON.stringify(manifest, null, 2)
  const zip = new JSZip()
  Object.entries(files).forEach(([path, content]) => zip.file(path, content))
  return {
    zip: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }),
    report,
    zipName: safeFileName(`${input.seed.project.projectId}_${input.datasetVersion}_research-package.zip`),
    reportName: safeFileName(`${input.reportVersion}_medical-data-report.docx`),
    manifest
  }
}

export function downloadArtifact(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
