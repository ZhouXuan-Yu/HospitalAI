# HospitalAI Phase 1 Validation

Date: 2026-08-03

## Environment

- Node.js: v24.12.0
- npm: 11.6.2
- Python default: 3.14.0; AI tests used local Python 3.12 venv because Python 3.14 needed native pydantic-core build tools.
- Java on PATH: unavailable; verified with `C:\Users\ZhouXuan\.jdks\jbr-17.0.14`.
- Maven on PATH: unavailable; verified with temporary local Maven 3.9.9 under `.tools`.
- Docker CLI: present, but Docker Desktop Linux engine was not running.
- PostgreSQL service: local PostgreSQL 18 was accepting connections, but postgres credentials were not available in this session.

## Commands Run

```powershell
npm --prefix apps/web install
npm --prefix apps/web run test
npm --prefix apps/web run build
.\.venv-ai\Scripts\python.exe -m pytest tests -q
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
$env:E2E_BASE_URL='http://127.0.0.1:5174'; npx playwright test
```

## Results

- Java rule tests: 2 passed, 0 failed.
- AI service tests: 2 passed, 0 failed.
- Vue store tests: 1 passed, 0 failed.
- Web build: passed; Vite emitted only a chunk-size warning.
- Playwright E2E: 6 passed, 0 failed across 1366x768 and 1920x1080.

## API Evidence

Normal patient `E001`:

- `GET /api/workbench/E001` returned `aiStatus=deterministic-demo`.
- Controlled evidence stage returned `complete`.
- First candidate had 2 evidence snippets.
- First evidence: `CAP演示证据集：住院成人初始抗感染路径`.

Adopt and simulated draft writeback:

- `POST /api/recommendations/REC-E001-v3/decision` returned `SIMULATED_DRAFT_WRITTEN`.
- Draft id: `DRAFT-780d280e-1c4c-4a22-a3b3-623ce8a7f7b4`.

Persistence readback:

- `GET /api/debug/persistence` returned `decisionCount=1`, `draftCount=1`, `auditCount=5`.
- Latest audit included `HIS_DRAFT_WRITE_SIMULATED` with detail `处方草稿模拟回写，非正式医嘱`.

Safety cases:

- `E002-2` inherited confirmed allergy and blocked `C-AMOX`.
- `E004` returned cross-department active medication alert for cardiology azithromycin.
- `E005` returned missing CRP and creatinine; neither was treated as normal.

## Visual Evidence

- `docs/validation/workbench-1366.png`
- `docs/validation/workbench-1920.png`

Both screenshots show the three-column doctor workbench without visible overlap at the target desktop widths.

## 2026-08-03 M1 Incremental Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run test
npm --prefix apps/web run build
```

Results:

- Java: 3 passed, 0 failed.
- Python: 2 passed, 0 failed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `HisSnapshotImportTest` imports a versioned HIS snapshot through `POST /api/integration/his/snapshots/import`.
- The imported patient and encounter are then read through `GET /api/worklist`.
- `GET /api/debug/persistence` shows the applied inbound event status.
- The doctor workbench select now reads encounter options from `/api/worklist` instead of a fixed front-end list.

Remaining M1 gaps:

- PostgreSQL/pgvector integration validation is still pending because this local session needs Docker Desktop Linux engine or PostgreSQL credentials.
- Online HIS connectors remain specified by contract; field mapping against a real hospital export sample is still pending.

## 2026-08-03 Contract And Rule Governance Validation

Commands:

```powershell
npm install
npm run test:contracts
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run test
npm --prefix apps/web run build
git diff --check
```

Results:

- Contract validation: passed; HIS snapshot JSON Schema and OpenAPI path gates are valid.
- Java: 6 passed, 0 failed.
- Python: 2 passed, 0 failed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.
- Whitespace check: passed.

New evidence:

- Import API now covers normal import, duplicate batch idempotency, old-version rejection and missing schemaVersion 400 response.
- `/api/rules` returns published demo rules and rule cases from `clinical_rule` and `clinical_rule_case`.
- `GET /api/workbench/E002-2` records rule execution rows in `rule_execution`, visible through `/api/debug/persistence`.

Remaining M2 gaps:

- Rule governance UI is still pending.
- Evidence manual review UI and real file parsing worker are still pending.
- FastAPI can retrieve Core API published chunks through `CORE_API_BASE_URL`; direct PostgreSQL/pgvector retrieval is still pending.
- Dose calculator still needs richer hospital rule dimensions, unit tests for renal adjustment and special populations, and hospital-reviewed numeric bounds before production.

## 2026-08-03 Dose And Evidence Governance Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
npm --prefix apps/web run test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run build
```

Results:

- Java: 9 passed, 0 failed.
- Contract validation: passed.
- Vue store: 1 passed, 0 failed.
- Python: 2 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `/api/rules` lifecycle supports draft, submit-review, publish and withdraw, with audit readback.
- `/api/dose/calculate` returns deterministic guidance from published `dose_rule`; unknown drug/rule returns `rule_not_found`.
- `/api/evidence/chunks` returns only `published` chunks and excludes `demo_unpublished` evidence from formal retrieval.

## 2026-08-03 Evidence Lifecycle And AI Retrieval Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm run test:contracts
npm --prefix apps/web run test
npm --prefix apps/web run build
git diff --check
```

Results:

- Java: 10 passed, 0 failed.
- Python: 4 passed, 0 failed.
- Contract validation: passed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.
- Whitespace check: passed.

New evidence:

- `/api/evidence/documents` uploads evidence as `uploaded`.
- `/api/evidence/documents/{evidenceId}/parse` creates `DocumentBlock` and `EvidenceChunk` rows with `review_pending`.
- `/api/evidence/documents/{evidenceId}/publish` makes chunks visible through `/api/evidence/chunks`.
- `/api/evidence/documents/{evidenceId}/withdraw` removes chunks from formal retrieval.
- FastAPI `POST /v1/evidence/retrieve` can use `CORE_API_BASE_URL` to retrieve Core API published chunks and returns an explicit degradation result if Core API evidence retrieval is unavailable.

## 2026-08-03 Recommendation Review State Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
npm --prefix apps/web run test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run build
```

Results:

- Java: 12 passed, 0 failed.
- Contract validation: passed.
- Vue store: 1 passed, 0 failed.
- Python: 4 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `GET /api/workbench/E004` generates a recommendation snapshot and executes hard rules.
- `POST /api/recommendations/REC-E004-v5/decision` on a strong-alert case creates a pharmacist review task and a draft with idempotency key.
- `GET /api/pharmacist/reviews?status=pending` returns the generated review task.
- `POST /api/pharmacist/reviews/{reviewId}/resolve` resolves the task and audits the operation.
- `POST /api/prescription-drafts/{draftId}/callback` records HIS callback status such as `his_confirmed`.
- Hard-blocked allergy case `REC-E002-2-v4` returns `blocked_by_hard_rule` and does not create a draft.

Remaining M3 gaps:

- More detailed field-level medication diff beyond regimen text is still pending.
- Pharmacist and collaboration workbench UI is still pending.
- Real HIS adapter network write and background Worker scheduling are still pending.

## 2026-08-03 M3 Completion Skeleton Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
npm --prefix apps/web run test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run build
```

Results:

- Java: 14 passed, 0 failed.
- Contract validation: passed.
- Vue store: 1 passed, 0 failed.
- Python: 4 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- Repeating the same recommendation decision reuses the same prescription draft idempotency key.
- Cross-department active medication creates a dedicated collaboration task, and `/api/collaboration/tasks/{taskId}/resolve` resolves it.
- Draft write task failures can be recorded through `/api/prescription-draft-write-tasks/{taskId}/mark-failed` and move to retry/dead-letter state after attempts.
- HIS callback marks the prescription draft and draft write task as completed.
- Importing a newer encounter data version expires existing recommendation snapshots for that encounter.

## 2026-08-03 M4 Tracking And Research Assets Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
npm --prefix apps/web run test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run build
```

Results:

- Java: 16 passed, 0 failed.
- Contract validation: passed.
- Vue store: 1 passed, 0 failed.
- Python: 4 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `POST /api/patients/{patientId}/timeline` records a medication timeline event and `GET /api/patients/{patientId}/timeline` reads it back.
- `POST /api/patients/{patientId}/feedback` records treatment feedback with adverse signal and appends a linked timeline event when needed.
- `POST /api/patients/{patientId}/outcomes` records discharge outcome and readback evidence.
- `POST /api/research/cohorts` and `POST /api/research/cohorts/{cohortId}/variables` create a research cohort and variable dictionary entries.
- `POST /api/research/cohorts/{cohortId}/quality-check` calculates reproducible cohort checks from current database facts.
- `POST /api/research/cohorts/{cohortId}/freeze` freezes the cohort after quality check.
- `POST /api/research/cohorts/{cohortId}/reports` creates a report draft from frozen cohort metadata and `POST /api/research/reports/{reportId}/review` records review status.

Remaining M4 gaps:

- Fixed Python statistical execution, script version capture, output hashing and reproducible analysis directory are still pending.
- ADR escalation into pharmacist or knowledge-review workflow is still pending.
- De-identified export package and formal multi-person knowledge publication/withdrawal are still pending.

## 2026-08-03 M4 Statistics Export And Knowledge Review Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm run test:contracts
npm --prefix apps/web run test
npm --prefix apps/web run build
```

Results:

- Java: 17 passed, 0 failed.
- Python: 5 passed, 0 failed.
- Contract validation: passed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `POST /api/research/cohorts/{cohortId}/analysis-runs` requires a frozen cohort and records script version, statistic plan, input hash, output hash, result summary and artifact URI.
- FastAPI `POST /v1/research/statistics/run` returns deterministic fixed-version descriptive statistics with stable input/output hashes for the same de-identified aggregate snapshot.
- `POST /api/research/cohorts/{cohortId}/exports` requires a frozen cohort and records a de-identified export package URI, row count, data hash, requester and purpose.
- `POST /api/knowledge/submissions` rejects unreviewed reports by contract of the Core API state path and accepts reviewed report drafts as knowledge candidates.
- `POST /api/knowledge/submissions/{submissionId}/reviews` records role-scoped reviews; two distinct approving reviewer roles publish the candidate.
- `POST /api/knowledge/submissions/{submissionId}/withdraw` changes the candidate to `withdrawn` and writes audit evidence.

Remaining M4 gaps:

- Java reliable Worker invocation of the Python statistics endpoint and real artifact file persistence are still pending.
- ADR escalation into pharmacist or knowledge-review workflow is still pending.
- Formal knowledge UI, citation controls and finer role permissions are still pending.

## 2026-08-03 M4 Artifact Persistence And Analysis Task Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run test
npm --prefix apps/web run build
```

Results:

- Java: 17 passed, 0 failed.
- Contract validation: passed.
- Python: 5 passed, 0 failed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- Research analysis writes a real JSON artifact under configurable `hospitalai.artifact-root`, returns `local://research/...` URI and records the artifact SHA-256 as `outputHash`.
- De-identified export writes a JSONL artifact with `subjectKey` instead of direct patient identity, records URI and data hash.
- `GET /api/research/artifacts?uri=...` reads back artifact content and hash, with URI prefix/root escape protection in the repository.
- `POST /api/research/cohorts/{cohortId}/analysis-tasks` enqueues a reliable analysis task for a frozen cohort.
- `POST /api/research/analysis-tasks/{taskId}/mark-failed` records failure, increments attempts and schedules retry/dead-letter status.
- `.env.example` now exposes `HOSPITALAI_ARTIFACT_ROOT`; generated local artifacts are ignored by Git.

Remaining M4/M5 gaps:

- Background Java Worker schedule loop and stricter lease ownership are still pending; explicit Worker HTTP invocation of the FastAPI statistics endpoint is now covered below.
- Artifact download authorization, formal knowledge UI, ADR escalation, security hardening and operations gates remain for later milestones.

## 2026-08-03 M4 Java Worker To AI Statistics Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run test
npm --prefix apps/web run build
```

Results:

- Java: 17 passed, 0 failed.
- Contract validation: passed.
- Python: 5 passed, 0 failed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `POST /api/research/analysis-tasks/process-next` claims one eligible queued/retry task, builds a de-identified aggregate snapshot and calls `AI_SERVICE_BASE_URL/v1/research/statistics/run` over HTTP.
- Java integration test starts a local HTTP server at the AI statistics path, enqueues a frozen cohort task, runs `process-next`, and verifies the worker response contains the AI-returned `inputHash`.
- Worker completion writes `research_analysis_run`, marks the task `completed`, persists a JSON artifact containing `aiOutputHash` and the AI result summary, and verifies artifact SHA-256 by `GET /api/research/artifacts`.
- Failure path remains covered by `mark-failed`, which increments attempt count and schedules retry/dead-letter.

Remaining M4/M5 gaps:

- Automatic scheduled worker loop, stricter lease ownership fields and concurrent claim hardening are still pending.
- Artifact authorization, formal knowledge UI, pharmacist-facing ADR workbench and M5 operational gates remain pending.

## 2026-08-03 M4 ADR Escalation Validation

Commands:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
npm --prefix apps/web run test
npm --prefix apps/web run build
```

Results:

- Java: 18 passed, 0 failed.
- Contract validation: passed.
- Python: 5 passed, 0 failed.
- Vue store: 1 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.

New evidence:

- `POST /api/patients/{patientId}/feedback` records severe adverse feedback and creates an `adverse_drug_reaction` row with `review_status=review_pending`.
- `GET /api/adr/reviews?status=review_pending` exposes the pending ADR review queue.
- `POST /api/adr/reviews/{adrId}/resolve` confirms or rejects ADR; confirmation changes status to `reviewed`.
- Confirmed severe ADR is then read by `severeAdrs()` and appears as `HR-ADR-001` strong alert when the doctor opens the workbench again.
- The flow preserves the safety boundary: clinician feedback does not directly become a formal rule or formal knowledge item without pharmacist review.

Remaining M4/M5 gaps:

- Pharmacist UI, finer role authorization and formal knowledge citation controls remain pending.
- M5 operational gates remain pending.

## 2026-08-03 Workbench Ops Panel Validation

Commands:

```powershell
npm --prefix apps/web run test
npm --prefix apps/web run build
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; .\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml test
npm run test:contracts
..\..\.venv-ai\Scripts\python.exe -m pytest tests -q
```

Results:

- Vue store: 2 passed, 0 failed.
- Web build: passed; Vite emitted only the existing chunk-size warning.
- Java: 18 passed, 0 failed.
- Contract validation: passed.
- Python: 5 passed, 0 failed.

New evidence:

- Doctor workbench right panel now has tabs for risk/evidence and operational pending work.
- `useWorkbenchStore.loadOps()` calls real ADR and knowledge queue APIs.
- ADR pending items can be confirmed or rejected from the workbench right panel and refresh the current patient workbench after resolution.
- Knowledge submissions can be approved or rejected from the right panel.
- Research artifact URI can be read through `GET /api/research/artifacts`, and the panel shows SHA-256 plus content preview.
- Research analysis worker can be triggered from the right panel through `POST /api/research/analysis-tasks/process-next`.

Remaining UI gaps:

- This is an integrated operational panel, not a full independent pharmacist or research manager workbench.
- Artifact access still lacks role-based download authorization and redaction controls.
