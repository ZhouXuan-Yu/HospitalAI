# HospitalAI Phase 1

HospitalAI is a local-first development slice for a hospital pharmacy AI decision-support workbench. It uses synthetic data only and never writes formal medical orders.

## Run

```powershell
docker compose -f infra/docker-compose.yml --env-file .env.example up --build
```

Web: http://localhost:5173

Core API: http://localhost:8080

AI service: http://localhost:8000

## Local Checks

```powershell
npm --prefix apps/web install
npm install
npm run test:contracts
npm --prefix apps/web run test
npm --prefix apps/web run build
.\.venv-ai\Scripts\python.exe -m pytest tests -q
docker compose -f infra/docker-compose.yml --env-file .env.example run --rm core-api mvn test
```

The Java checks require Docker or a local JDK/Maven. This machine currently has Node, Python, Docker and psql, but `java`, `mvn`, and `gradle` are not on PATH.

## Local H2 Demo Used In Verification

When Docker Desktop is not running and PostgreSQL credentials are unavailable, the same Core API can be run against an in-memory H2 demo profile:

```powershell
$env:JAVA_HOME='C:\Users\ZhouXuan\.jdks\jbr-17.0.14'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$env:SPRING_PROFILES_ACTIVE='h2-demo'
$env:AI_SERVICE_BASE_URL='http://127.0.0.1:8000'
$env:SERVER_PORT='18080'
.\.tools\apache-maven-3.9.9\bin\mvn.cmd -f services/core-api/pom.xml spring-boot:run
```

Start AI and web locally:

```powershell
.\.venv-ai\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
$env:VITE_CORE_API_BASE='http://127.0.0.1:18080'
npm --prefix apps/web run dev -- --host 127.0.0.1
```

Current verified URL: http://127.0.0.1:5174

Set `CORE_API_BASE_URL=http://127.0.0.1:18080` for the AI service when you want evidence retrieval to use Core API published evidence chunks instead of the deterministic demo fallback.

## Useful API Smoke Checks

```powershell
Invoke-RestMethod http://127.0.0.1:18080/api/worklist
Invoke-RestMethod http://127.0.0.1:18080/api/rules
Invoke-RestMethod "http://127.0.0.1:18080/api/evidence/chunks?query=CAP"
```
