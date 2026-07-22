# Module 27 — Reports

## Status: Complete

## What was built

`Report` — a generated CSV export of Projects, Tasks, Deliverables, or
Employees for an organization, tracked as a persisted artifact with its own
download link. Reuses two pieces of infrastructure the Documents module
built (`StorageService` for the file, `@SkipTransform()` + `StreamableFile`
for the download endpoint) but generates its own file server-side rather
than accepting an upload — the inverse direction of Documents' upload flow.

### Design

- **First entity scoped to `Organization` only — no `Project` at all.**
  Every module from References (18) through Documents (25) required both
  `organizationId` and `projectId`; a report is deliberately an
  organization-wide snapshot (e.g. "all tasks across every project in this
  org"), so it has nowhere sensible to attach a single project.
- **Second entity (after Task) to skip the `@@unique` name constraint.**
  Regenerating "Tasks Report" multiple times over time is completely
  normal — each run is a new point-in-time snapshot, not an edit of a
  previous one, so reusing the same name repeatedly is expected rather
  than an error condition.
- **Permission naming follows MASTER_PROMPT's own example literally**:
  the spec text lists `Reports.Export` as its one worked permission
  example, so generation is gated by `.Export` rather than the `.Create`
  every other module uses. Combined with `.View` and `.Delete` (no
  `.Update` — a generated report has no editable metadata once created),
  this is the first three-permission module in the build, a deliberate
  point between Dashboard's one (`.View` only) and everyone else's four.
  `restore` is gated behind `.Delete` rather than `.Update` accordingly,
  since there's no `.Update` permission to reuse.
- **Second service (after Dashboard) to inject `PrismaService` directly.**
  Generating a report means reading raw rows from Project/Task/
  Deliverable/Employee — cross-entity read access that doesn't belong to
  any single module's service, the same reasoning that justified
  `DashboardService`'s direct Prisma access.
- A small dependency-free CSV builder (`utils/csv.util.ts`) handles RFC
  4180 quoting (commas, quotes, newlines) and null/undefined/Date
  formatting — simple enough not to justify pulling in a CSV library for a
  single consumer.

### Backend

- `ReportsService.generateReport()` validates the organization, builds the
  CSV via a `switch` over `ReportType` (one query + column mapping per
  type — the Employees case additionally `include: { user: true }` to pull
  the linked name/email), writes it through `StorageService.save()` under
  `reports/<organizationId>/`, and persists a `Report` row. The name
  defaults to `"<Type> Report - <ISO date>"` when the caller doesn't
  supply one, mirroring Documents' file-name-as-default-name pattern.
- `GenerateReportDto` takes `organizationId`, `type`, optional `name`, and
  optional `format` (only `'CSV'` exists today — the format field is kept
  dynamic rather than hardcoded, the same "don't fake support you don't
  have, but don't hardcode either" stance `StorageService`'s driver check
  took for S3/MinIO).
- No repository `update()` method at all — the only mutations are
  `softDelete`/`restore`, reflecting that a report's fields never change
  post-generation.

### Frontend

- `GenerateReportDialog` is the simplest form in the build with a
  cascading dropdown: just Organization → nothing (Type is a flat,
  non-cascading select since report types aren't project-scoped), plus an
  optional Name field. No file picker (unlike Documents' create form) since
  the file is generated server-side, not supplied by the user.
- `downloadReport()` in `reportsApi.ts` is a near-identical twin of
  `downloadDocument()` — same blob-fetch-and-synthetic-anchor-click
  pattern, duplicated rather than extracted into a shared helper since the
  two call sites differ only in URL and this is the first repetition (not
  yet worth a shared abstraction per the project's "three similar lines
  beats a premature abstraction" convention).
- `ReportsListPage` has no Edit action (matching the lack of an `.Update`
  permission and endpoint) — just Download, Delete, and Restore, the
  narrowest action set of any list page so far.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0` (caught and fixed two
  real issues beyond formatting: an unnecessary type assertion in a test,
  and a `@typescript-eslint/no-base-to-string` warning in the CSV utility,
  fixed by adding an explicit type-narrowing `toStringValue` helper instead
  of a bare `String(value)` call), unit tests (10 new `ReportsService`
  cases — CSV generation per type including the Employees user-join case,
  name defaulting, caller-supplied names, organization validation,
  delete/restore, download-info resolution; 5 new `csv.util` cases —
  header+rows, quoting of commas/quotes/newlines, null/undefined handling,
  Date serialization, empty-rows — 357 total), e2e tests (8 new cases —
  full generate → list → fetch → download (exact CSV header content,
  `text/csv` content-type) → delete → restore lifecycle, default naming,
  the Employees report's linked user data appearing in the downloaded CSV,
  invalid type rejected, non-existent organization rejected, organization
  and type filtering, 404s). Running the full e2e suite at default
  parallelism (16 workers) triggered widespread `ReferenceError: trying to
  require a file after the Jest environment has been torn down` failures
  across ~14 suites — traced to Postgres connection-pool exhaustion (each
  worker's `pg.Pool` defaults to 10 connections against a 100-connection
  Postgres, and the e2e suite has grown to 23 spec files), not a code
  regression: re-running with `--maxWorkers=4` passed all 195 tests
  cleanly except the one already-known `afterAll`/`app.close()` teardown
  flake (this run on `permissions.e2e-spec.ts`), confirmed unrelated by
  re-running it alone (8/8). This is a pre-existing scaling limit of the
  test harness as suite count grows, not something introduced by Reports;
  noted here rather than fixed, since adjusting Jest/Prisma connection
  concurrency settings was out of scope for this module.
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, generate through dialog, delete through
  confirm dialog — 106 total). Full-suite concurrent run hit the known
  "create/generate through form dialog" timeout flake on five files
  (Features, References, Sprints, Tasks — never Reports' own file);
  re-running all five in isolation passed 20/20, confirming it was
  Vitest's concurrent-load flake rather than a regression. Production
  `vite build` succeeded with `ReportsListPage` code-split into its own
  chunk.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, ran the seed script (added the three
  `Reports.*` permissions and generated a real sample "Sample Tasks
  Report" CSV through `ReportsService.generateReport()` — not a
  database-only fixture). Verified end-to-end in a real browser via
  agent-browser: confirmed the Reports nav item and seeded row with
  organization/type/size resolved, generated a new Employees report
  through the Organization → Type form, confirmed the auto-derived name
  ("Employees Report - 2026-07-22"), clicked Download with no console
  errors, deleted it, confirmed it moved to the Inactive filter, and
  restored it back to Active.
