import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import YAML from 'yaml'

const root = process.cwd()
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const readYaml = (file) => YAML.parse(fs.readFileSync(path.join(root, file), 'utf8'))

const schema = readJson('contracts/schema/his-snapshot.v1.json')
const fixture = readJson('fixtures/his/synthetic-cap-patients.v1.json')
const ajv = new Ajv2020({ allErrors: true })
const validateSnapshot = ajv.compile(schema)
const valid = validateSnapshot(fixture)

if (!valid) {
  console.error('HIS snapshot fixture failed schema validation:')
  console.error(ajv.errorsText(validateSnapshot.errors, { separator: '\n' }))
  process.exit(1)
}

const requiredCorePaths = [
  '/api/worklist',
  '/api/workbench/{encounterId}',
  '/api/integration/his/snapshots/import',
  '/api/recommendations/{recommendationId}/decision',
  '/api/recommendations',
  '/api/pharmacist/reviews',
  '/api/pharmacist/reviews/{reviewId}/resolve',
  '/api/collaboration/tasks',
  '/api/collaboration/tasks/{taskId}/resolve',
  '/api/prescription-drafts/{draftId}',
  '/api/prescription-drafts/{draftId}/callback',
  '/api/prescription-draft-write-tasks',
  '/api/prescription-draft-write-tasks/{taskId}/mark-failed',
  '/api/patients/{patientId}/timeline',
  '/api/patients/{patientId}/feedback',
  '/api/patients/{patientId}/outcomes',
  '/api/research/cohorts',
  '/api/research/cohorts/{cohortId}/variables',
  '/api/research/cohorts/{cohortId}/quality-check',
  '/api/research/cohorts/{cohortId}/freeze',
  '/api/research/cohorts/{cohortId}/analysis-runs',
  '/api/research/cohorts/{cohortId}/analysis-tasks',
  '/api/research/analysis-tasks/{taskId}/mark-failed',
  '/api/research/cohorts/{cohortId}/exports',
  '/api/research/artifacts',
  '/api/research/cohorts/{cohortId}/reports',
  '/api/research/reports/{reportId}/review',
  '/api/knowledge/submissions',
  '/api/knowledge/submissions/{submissionId}/reviews',
  '/api/knowledge/submissions/{submissionId}/withdraw',
  '/api/rules',
  '/api/rules/{ruleId}/versions/{version}/submit-review',
  '/api/rules/{ruleId}/versions/{version}/publish',
  '/api/rules/{ruleId}/versions/{version}/withdraw',
  '/api/dose/calculate',
  '/api/evidence/chunks',
  '/api/evidence/documents',
  '/api/evidence/documents/{evidenceId}/parse',
  '/api/evidence/documents/{evidenceId}/publish',
  '/api/evidence/documents/{evidenceId}/withdraw'
]
const requiredHisPaths = [
  '/v1/his/patients/{hisPatientId}/snapshot',
  '/v1/his/events',
  '/v1/his/prescription-drafts',
  '/v1/his/prescription-drafts/{draftId}/status'
]
const requiredAiPaths = [
  '/v1/evidence/retrieve',
  '/v1/research/statistics/run'
]

assertOpenApi('contracts/openapi/core-api.v1.yaml', requiredCorePaths)
assertOpenApi('contracts/openapi/his-adapter.v1.yaml', requiredHisPaths)
assertOpenApi('contracts/openapi/ai-service.v1.yaml', requiredAiPaths)

console.log('Contract validation passed: HIS snapshot JSON Schema and OpenAPI path gates are valid.')

function assertOpenApi(file, paths) {
  const doc = readYaml(file)
  if (doc.openapi !== '3.0.3') {
    throw new Error(`${file} must use OpenAPI 3.0.3`)
  }
  if (!doc.info?.title || !doc.info?.version) {
    throw new Error(`${file} must define info.title and info.version`)
  }
  for (const route of paths) {
    if (!doc.paths?.[route]) {
      throw new Error(`${file} missing required path ${route}`)
    }
  }
}
