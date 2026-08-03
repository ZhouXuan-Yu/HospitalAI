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

- Recommendation expiration on source data version change is still pending.
- Structured field-level medication diff is still pending.
- Dedicated cross-department collaboration task model is still pending.
- Real HIS adapter network write, retry and dead-letter handling are still pending.
