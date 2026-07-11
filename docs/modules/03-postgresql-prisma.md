# Module 03 — PostgreSQL + Prisma

## Status: Complete

## What was built

- `backend/prisma/schema.prisma` — datasource (PostgreSQL) and generator
  only; no business models yet (those arrive with their owning modules,
  starting at Authentication/Users/Roles/Permissions/Organizations).
  Generator uses `provider = "prisma-client"` with
  `output = "../src/generated/prisma"` and `moduleFormat = "cjs"`.
- `backend/prisma.config.ts` — Prisma 7's config entrypoint; loads the
  repo-root `.env` with `override: true` (see incident note below) and
  supplies `DATABASE_URL` to the migrate/generate CLI.
- `backend/src/prisma/prisma.service.ts` / `prisma.module.ts` — a `@Global`
  `PrismaModule` exposing `PrismaService` (extends the generated
  `PrismaClient`, using the `@prisma/adapter-pg` driver adapter, connected
  via `pg`). Handles `$connect`/`$disconnect` on Nest lifecycle hooks and
  logs Prisma `error`/`warn` events through Nest's `Logger`.
- Wired into `AppModule`.
- Verified against a real, dockerized PostgreSQL: ran `prisma migrate dev`
  (empty init migration, since there are no models yet), `prisma migrate
  deploy`, and booted the full Nest app against it successfully (unit
  tests, e2e test, and a manual `node dist/main.js` run all connect and
  serve requests).

## Why Prisma 7 needed a driver adapter

This project's Prisma resolved to v7.8.0, which requires a driver adapter
(`@prisma/adapter-pg` + `pg`) for the new engine-less TypeScript client —
plain `new PrismaClient({ log: [...] })` no longer type-checks without
either `adapter` or `accelerateUrl`. `PrismaService` constructs a
`PrismaPg` adapter from `DATABASE_URL` and passes it to `super()`.

## Non-obvious fixes (read before touching backend/tsconfig*.json)

1. **Prisma's new "prisma-client" generator emits ESM (`import.meta.url`,
   `.js`-suffixed relative imports) by default.** This broke Jest (which
   runs ts-jest in CommonJS). Fixed by setting `moduleFormat = "cjs"` in
   the generator block, plus a `moduleNameMapper` in both
   `backend/package.json`'s `jest` config and `backend/test/jest-e2e.json`
   to strip the `.js` suffix from relative imports
   (`"^(\\.{1,2}/.*)\\.js$": "$1"`) so Jest's resolver can find the `.ts`
   sources.
2. **The generated client must live inside `src/`**
   (`backend/src/generated/prisma`), not next to it. Nest's build infers
   `rootDir` from the full set of compiled files; if the Prisma client
   lived outside `src/` (e.g. `backend/generated/`), `tsc` widened rootDir
   to the `backend/` root and nested output under `dist/src/main.js`
   instead of `dist/main.js`, breaking the Docker/PM2 entrypoint. Keeping
   generated output under `src/` keeps `dist/` flat.
3. **`prisma.config.ts` (at the backend root, outside `src/`) must be
   excluded from the build's TS project**, or the same rootDir-widening
   problem recurs. It's excluded via `tsconfig.build.json`'s `exclude`
   (`"prisma.config.ts"`) plus an explicit `rootDir: "./src"` override
   there — deliberately *not* in the base `tsconfig.json`, since that base
   config is also what ESLint's `projectService` and the IDE use to
   type-check `test/*.e2e-spec.ts`; restricting it there broke linting for
   the `test/` folder.
4. **`"incremental": true` in `backend/tsconfig.json` silently produced
   broken builds**: most files emitted only a `.d.ts` with no matching
   `.js` (while a handful of files, e.g. `main.ts`, emitted normally),
   reproduced both via `nest build` and plain `tsc`, on the host and
   inside the Docker build. Disabling `incremental` (removed entirely from
   `tsconfig.json`) fixed it completely — verified emission is now
   complete and correct. Do not re-enable `incremental` without
   re-verifying `dist/` contains a `.js` for every compiled `.ts`.
5. **Jest's e2e config needs `NODE_OPTIONS=--experimental-vm-modules`**
   (via `cross-env` in the `test:e2e` script) because Prisma 7's client
   engine loads its WASM query compiler via dynamic `import()`, which Jest
   only supports experimentally.

## Incident: ambient `DATABASE_URL` from an unrelated project

While first testing `prisma migrate dev` locally, it connected to
`localhost:5432` and reported drift against a completely unrelated
e-commerce schema (`products`, `reviews`, `users.firebaseUid`, ...). Root
cause: the host shell already had `DATABASE_URL` exported (pointing at an
unrelated project's database, `pragmr_baas`), and Node's `dotenv` does not
override pre-existing `process.env` values by default — so our `.env` was
silently ignored in favor of the ambient one. No destructive command was
run against that database (only a local, non-applying
`migrate dev --create-only`, which detected drift and stopped; a follow-up
manual verification query was blocked by the user's own permission
settings). Fixed by adding `override: true` to the `dotenv.config()` call
in `prisma.config.ts`, so this project's `.env` always wins regardless of
what's already exported in the shell. **This same hazard applies to the
running application itself**, not just the Prisma CLI — `main.ts` does not
yet load `.env` at all (it will, in Step 5's `ConfigModule` setup), so
until then, always pass `DATABASE_URL`/`REDIS_URL` explicitly when running
the app outside Docker on this machine, rather than relying on ambient
shell state.
