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
- OpenAPI and JSON Schema files exist, but automated contract validation has not yet been added to CI.
- Online HIS connectors remain specified by contract; field mapping against a real hospital export sample is still pending.
