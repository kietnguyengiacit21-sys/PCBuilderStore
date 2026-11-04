# Milestone 1 audit report

## Scope and verification method

This audit reviewed the repository as checked out on disk and executed the commands listed below without running database migrations or connecting to a live PostgreSQL/Neon database.

## 1) Backend verification

### Verified directories and files

The following were inspected and exist in the repository:

- `backend/` directory exists.
- `backend/package.json` exists and contains the backend scripts.
- `backend/src/app.ts` exists and is the Express application factory.
- `backend/src/server.ts` exists and is the local server entry.
- `backend/prisma/schema.prisma` exists.
- `backend/prisma/migrations/20261102000000_initial/migration.sql` exists.
- `backend/scripts/port_mysql_schema.py` exists.
- `api/[[...path]].ts` exists at the repository root.
- `vercel.json` exists.
- `schema_35_tables.sql` exists at the repository root.
- `frontend/schema-35-tables-reference.sql` also exists.

### Backend package scripts

Inspected from `backend/package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "db:format": "prisma format",
    "db:generate": "prisma generate",
    "db:validate": "prisma validate",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### Missing files / discrepancies

No missing backend directory or core backend files were found in the checked-out repo.

One shell-specific discrepancy was observed: a literal `Test-Path` check for `api/[[...path]].ts` returned false in PowerShell because the bracketed filename is treated as a glob/wildcard pattern. The actual file exists on disk, and the file was confirmed by direct file inspection and reading. This is a PowerShell path expansion issue, not an implementation absence.

There is no committed `.env` file in the repository root or under `backend/`; only `backend/.env.example` exists. That is consistent with a project that has environment templates but no local runtime secrets checked in.

## 2) Database migration verification

### Table representation check

I did not run Prisma migrations or connect to a database.

I did inspect the source SQL and generated migration artifacts directly. The count-based verification showed:

- `schema_35_tables.sql`: 35 `CREATE TABLE` statements.
- `backend/prisma/migrations/20261102000000_initial/migration.sql`: 35 `CREATE TABLE` statements.

This confirms that all 35 original tables are represented in the generated migration file.

### Schema and migration inspection

The generated migration file includes:

- 68 `CREATE SEQUENCE` statements.
- 1 `CREATE COLLATION` statement named `mysql_0900_ai_ci`.
- 7 `CREATE TRIGGER` statements.
- 2 `CREATE FUNCTION` statements.

The migration contains custom sequence-based unsigned ID handling and a custom ICU collation approximation. I did not execute or validate this against a live PostgreSQL/Neon database.

### Primary keys, foreign keys, unique constraints, indexes, check constraints

These are present in the generated SQL and Prisma schema as generated artifacts:

- Primary keys: present in model definitions and migration SQL.
- Foreign keys: present in both files.
- Unique constraints: present in both files.
- Indexes: present in both files.
- Check constraints: present in the migration; the migration file contains substantially more explicit checks than the source MySQL DDL, which is expected because of converted unsigned-range and PostgreSQL-compatible invariants.

### Potentially unsupported or risky conversions

The following conversion risks were identified from the generated migration and schema alone:

1. Custom collation approximation
   - The migration creates `mysql_0900_ai_ci` using ICU locale `und-u-ks-level1`.
   - This approximates MySQL collation behavior, but ICU/MySQL collation semantics are not identical. This requires live verification on the target PostgreSQL/Neon engine.

2. Unsigned ID emulation
   - The migration uses paired low/high sequences and a custom `next_unsigned_bigint(...)` pattern, which is a valid workaround but is not a direct MySQL equivalent.
   - This requires a real database verification pass against a staging PostgreSQL instance before production use.

3. Trigger-driven timestamp behavior
   - `ON UPDATE CURRENT_TIMESTAMP` behavior was rewritten using PostgreSQL triggers in the generated migration.
   - This is a functional translation, not a verified behavior comparison against a live database instance.

4. Check and data-type translation risk
   - `TINYINT(1)` -> boolean, JSON -> JSONB, and MySQL text/date types were translated to PostgreSQL equivalents.
   - These are reasonable mappings, but the script and migration should still be compared against a staging database schema before claiming parity.

### Not verified and deliberately not executed

I did not run `prisma migrate deploy`, `prisma validate` against a live DB, or connect to Neon/production. The task explicitly forbids database migration execution.

## 3) Frontend and backend integration

### React/Vite frontend build

I executed the repository build command:

```powershell
npm run build
```

Result: successful. The output showed the frontend build completed and the backend TypeScript typecheck also passed.

### Express health endpoint

I started the backend locally and then executed:

```powershell
curl.exe -sS http://localhost:3000/api/health
```

Result:

```json
{"status":"ok","service":"pc-builder-store-api","timestamp":"2026-11-02T09:35:46.102Z"}
```

This confirms the Express health endpoint returns HTTP 200 and valid JSON when the app is running.

### Database health behavior when DATABASE_URL is absent

I executed:

```powershell
curl.exe -sS http://localhost:3000/api/health/db
```

Result:

```json
{"status":"error","database":"disconnected","timestamp":"2026-11-02T09:35:46.142Z"}
```

This is the expected behavior when `DATABASE_URL` is not set. The route catches the DB failure and responds with `HTTP 503`.

### Real API integration vs static HTML data

The frontend codebase contains static HTML pages and a compatibility renderer, but the actual backend implementation is limited to health endpoints. I inspected the code and the app behavior:

- The frontend renders legacy HTML screens through the React compatibility layer.
- The backend exposes `/api/health` and `/api/health/db` only.
- There is no working real catalog, cart, checkout, auth, or build-PC API integration in the checked-in implementation.
- The UI still uses static/mock-style data and legacy page rendering rather than a real backend-backed data flow.

This means the current implementation is a foundation layer and compatibility shell, not a fully integrated production-ready application.

## 4) Tests actually executed and their results

These commands were executed and observed:

```powershell
npm run build
```

Result: success. Frontend build completed, and backend typecheck passed.

```powershell
npm test
```

Result: success. Vitest reported `2 passed (2)` test files and `10 passed (10)` tests.

```powershell
curl.exe -sS http://localhost:3000/api/health
```

Result: `{"status":"ok","service":"pc-builder-store-api",...}`

```powershell
curl.exe -sS http://localhost:3000/api/health/db
```

Result: `{"status":"error","database":"disconnected",...}` with `HTTP 503`.

## 5) Exact commands for the next staging setup

These are the exact commands to use next once a staging database and credentials are available. They are not a claim of success; they are the required next steps.

```powershell
# 1) install dependencies
npm install

# 2) run local build and tests
npm run build
npm test

# 3) set environment variables for staging (example)
$env:DATABASE_URL = "<pooled-neon-runtime-url>"
$env:DIRECT_URL = "<direct-neon-migration-url>"

# 4) validate Prisma schema and migration metadata
npm run db:validate --workspace=@pc-builder-store/backend

# 5) deploy migration only in staging after review
npm run db:migrate:deploy --workspace=@pc-builder-store/backend

# 6) optional seed step if the staging environment requires minimal baseline data
npm run db:seed --workspace=@pc-builder-store/backend

# 7) smoke-check API health endpoints
curl.exe -sS http://localhost:3000/api/health
curl.exe -sS http://localhost:3000/api/health/db
```

## Conclusion

The repository does contain the required Milestone 1 backend files and migration artifacts, and the higher-level implementation is consistent with the milestone report. However, the migration and database parity have not been verified on a real PostgreSQL/Neon database, and the application remains a foundation with static/mock frontend data and limited health-only backend wiring.

No migrations were executed as part of this audit.
