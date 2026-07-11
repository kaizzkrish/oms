# Module 05 — NestJS Backend Setup

## Status: Complete

## What was built

- **Configuration**: `src/config/configuration.ts` (typed, namespaced config
  loaded from `process.env`) and `src/config/env.validation.ts` (Joi schema
  validating required vars at boot — fails fast with a clear message if
  misconfigured). Registered via `ConfigModule.forRoot({ isGlobal: true,
  ignoreEnvFile: true, load: [configuration], validationSchema })`.
- **Logging**: `src/logger/winston.config.ts` — Winston replaces Nest's
  default logger app-wide (via `WinstonModule.createLogger` passed to
  `NestFactory.create`). Console output uses Nest-like colorized formatting
  in development and JSON in production; `storage/logs/error.log` and
  `storage/logs/combined.log` capture file output for ops/audit purposes.
- **Cross-cutting HTTP concerns** (`src/common/`):
  - `filters/all-exceptions.filter.ts` — single global exception filter
    producing a standard error envelope (`{ success: false, statusCode,
    timestamp, path, message, error }`), with explicit handling for
    `HttpException` and common Prisma error codes (P2002 unique
    constraint → 409, P2003 FK violation → 400, P2025 not found → 404).
  - `interceptors/transform.interceptor.ts` — wraps every successful
    response in a matching standard envelope (`{ success: true,
    statusCode, timestamp, path, data }`).
  - `interceptors/logging.interceptor.ts` — logs method/URL/status/duration
    for every request via Nest's `Logger` (backed by Winston).
  - All three are registered globally in `AppModule` via `APP_FILTER` /
    `APP_INTERCEPTOR` DI tokens, so they also apply inside Nest's testing
    module (verified by the e2e test) without needing `app.useGlobal*()`
    calls at every bootstrap site.
- **Swagger**: mounted at `/docs` (path configurable via `SWAGGER_PATH`),
  with a bearer-auth security scheme pre-registered for the Authentication
  module's JWT.
- **Security/hardening**: Helmet, CORS (origin from `CORS_ORIGIN`), a
  global `ValidationPipe` (whitelist + forbid unknown properties +
  transform), and `@nestjs/throttler`'s `ThrottlerGuard` registered
  globally (rate limit window/max from `RATE_LIMIT_TTL`/`RATE_LIMIT_MAX`).
- **Global API prefix**: all controllers are mounted under `/api` except
  `health`, matching the nginx routing table from Module 02.
- **Health check**: `src/health/` — a Terminus `HealthCheckService` at
  `GET /health` running custom `PrismaHealthIndicator` and
  `RedisHealthIndicator` checks (a real `SELECT 1` / `PING` against each
  service, not just "is the module loaded").
- `PrismaService`/`RedisService` were refactored to read their connection
  config through the new `ConfigService` (dependency injection) instead of
  reading `process.env` directly.
- The placeholder `AppController`/`AppService` ("Hello World") scaffold
  was removed — it served no purpose once a real health endpoint exists,
  and keeping it would have been dead/placeholder code.

## The ambient-env fix, properly applied this time

Module 03 fixed this for the Prisma CLI (`prisma.config.ts`). This module
fixes it for the **running application**: `src/main.ts` now does
`dotenv.config({ path: <repo-root>/.env, override: true })` as the very
first statement, before any other import (including `@nestjs/config`)
touches `process.env`. This guarantees the project's own `.env` always
wins over a same-named variable already exported in the shell.

**Bug caught during verification:** the first version of this used
`path.resolve(__dirname, '../.env')`, which is wrong for a file at
`src/main.ts` (or its compiled twin `dist/main.js`) — both are exactly one
directory below `backend/`, so reaching the repo root needs `../../.env`,
not `../.env`. The mistake was caught by deliberately booting the compiled
app *without* manually overriding `DATABASE_URL` on the command line and
watching Nest's config validation fail with "SERVER_HOST is required" etc.
(dotenv had silently loaded 0 variables from a nonexistent path). Fixed,
then re-verified the same way — booting cleanly and connecting to Postgres
and Redis using only the project's `.env`. `test/setup-env.ts` (used by
the e2e Jest config) already had the correct `../../.env` depth from
`backend/test/`.

**Second bug caught in the Docker build:** `dotenv` was a devDependency
(added in Module 03 only for `prisma.config.ts`, a CLI-only file). Once
`main.ts` started importing it directly for the override fix above, it
became a genuine runtime dependency — but the backend Dockerfile's
production stage (`pnpm deploy --prod`) strips devDependencies, so the
container crash-looped with `Cannot find module 'dotenv'`. Fixed by
moving it to `dependencies`. Caught by actually running the rebuilt
container (not just `nest build`/unit tests, which don't distinguish
dependency scoping) and reading its crash logs.

## Verification performed

- `nest build`, unit tests (18 specs across filters/interceptors/health
  indicators/Prisma/Redis), and lint all pass.
- e2e test hits the real `GET /health` against the dockerized Postgres/
  Redis and asserts both report `up`, wrapped in the standard response
  envelope.
- Booted the compiled app directly (`node dist/main.js`) with no manual
  env overrides and confirmed `/health` and `/docs` both respond
  correctly, proving the `.env` override fix works for the real app, not
  just tests.
- Rebuilt and restarted the `backend` Docker image via `docker compose up
  --build backend` to confirm the change set is Docker-compatible.
