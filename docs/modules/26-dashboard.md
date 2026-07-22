# Module 26 — Dashboard

## Status: Complete

## What was built

`Dashboard` — a read-only, cross-entity summary view, and the first module
in the build with **no Prisma model at all**. Every module from 8 (Users)
through 25 (Documents) was a manageable resource with its own table,
CRUD endpoints, and permission set; Dashboard is pure aggregation over data
that already exists, closing out the "operational" half of the build before
Reports/Notifications/Audit Logs/Settings.

### Design

- `GET /dashboard/summary?organizationId=<optional>` returns counts for
  Organizations, Employees, Projects, Tasks, Deliverables, and Documents,
  plus a full status breakdown for Projects/Tasks/Deliverables (every
  status value present with a zero count when nothing matches, not just
  the statuses that happen to have data — so the frontend never has to
  guess which keys exist).
- **`organizations` is deliberately never scoped** by the `organizationId`
  filter, even when one is supplied — it's a global, informational count
  (how many organizations exist in the system), not a per-organization
  metric the way every other field is. Every other count/breakdown *is*
  filtered by `organizationId` when provided, mirroring the org-filter
  pattern every list page in the build already uses.
- **First service to inject `PrismaService` directly** rather than going
  through other modules' services. Every module up to now respected strict
  layering (Documents' `DocumentsService` calls `ProjectsService`, not
  `prisma.project` directly) because each owns exactly one entity's
  business rules. Dashboard owns none — its entire job is cross-entity
  read aggregation, so querying Prisma directly for `count`/`groupBy`/
  `aggregate` is the correct layer, not a shortcut.
- **First and only module with a single permission.** Every other module
  has four (`.View`/`.Create`/`.Update`/`.Delete`); Dashboard is read-only
  by nature (there's nothing to create, update, or delete), so it gets only
  `Dashboard.View` under its own "Dashboard" permission group — the first
  permission group name in the build that isn't suffixed "Management",
  since there's nothing here to manage.
- Response shape uses real Swagger-annotated entity classes
  (`DashboardSummaryEntity` composing `ProjectsSummaryEntity`/
  `TasksSummaryEntity`/`DeliverablesSummaryEntity`/`DocumentsSummaryEntity`)
  rather than a plain TypeScript interface, keeping API documentation
  consistent with every other endpoint in the build even though there's no
  Prisma model backing it.

### Backend

- `DashboardService.getSummary(organizationId?)` runs six independent
  Prisma queries in parallel via `Promise.all` (organization count,
  employee count, project count + groupBy, task count + groupBy,
  deliverable count + groupBy, document aggregate for count + sum of
  `sizeBytes`) — a single round trip per entity rather than fetching rows
  and counting in JS. A small `buildStatusMap` helper zero-fills every
  known status value before overlaying the actual `groupBy` counts.
- No repository, no DTOs beyond a single `QueryDashboardDto` (just the
  optional `organizationId`), no module dependencies beyond `PrismaModule`
  (already global via `PrismaModule` import chain) — the leanest module
  in the build by file count.

### Frontend

- Its own `/dashboard` route (not folded into the existing `/` Home page,
  which stays a permission-free landing page every authenticated user can
  reach regardless of role) — gated by `Dashboard.View` like every other
  nav item, appended to the nav in build order after Documents.
- `DashboardPage` renders six `StatCard`s (Organizations, Employees,
  Projects, Tasks, Deliverables, Documents-with-formatted-size) in a
  responsive `Grid`, plus three `StatusBreakdown` panels (Projects/Tasks/
  Deliverables by Status) each showing a label, count, and a `LinearProgress`
  bar sized proportionally to that status's share of the total — matching
  the rest of the app's plain-MUI visual language rather than introducing
  a charting library. An Organization filter at the top re-queries the
  summary scoped to one org.
- Local `prevOpen`-style effect concerns don't apply here (no dialog), but
  the loading state uses `Skeleton` placeholders sized to match the real
  stat cards while the query is in flight.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (3 new
  `DashboardService` cases — status-map zero-filling with real data,
  documents `_sum` defaulting to 0 when there are no documents,
  organization-scoping applied to every query except the global
  organizations count — 342 total), e2e tests (4 new cases — global
  summary with `toBeGreaterThanOrEqual` assertions against shared dev-DB
  state, organization-scoped summary against freshly created fixtures for
  exact counts, zero-filled breakdowns for a brand-new empty organization,
  401 without a token). Full e2e suite run showed the known pre-existing
  `afterAll`/`app.close()` teardown timeout on one suite
  (`project-modules.e2e-spec.ts` this run); re-run alone passed 11/11,
  confirming it was unrelated to this module.
- Frontend: `tsc -b --force`, `eslint --max-warnings 0` (caught and fixed
  one real issue: an unnecessary `eslint-disable` comment for a rule that
  wasn't actually flagging the code), Vitest (3 new cases — stat cards
  render from a mocked summary, status breakdown panels render with
  zero-collision fixture data after an initial run caught a same-numeral
  collision between a stat card and a breakdown row, organization filter
  triggers a re-scoped refetch — 101 total). Full-suite concurrent run hit
  the known "create through form dialog" timeout flake on six files
  (Clients, Deliverables, Features, References, Sprints, Tasks — a
  different rotating set each run, never Dashboard's own file); re-running
  all six in isolation passed 24/24, confirming it was Vitest's
  concurrent-load flake rather than a regression. Production `vite build`
  succeeded with `DashboardPage` code-split into its own chunk.
- Rebuilt the Docker backend and frontend images, recreated the containers,
  restarted nginx, ran the seed script (added the single `Dashboard.View`
  permission; no sample data to seed since there's no entity). Verified
  end-to-end in a real browser via agent-browser: confirmed the Dashboard
  nav item and page load real aggregate counts from the accumulated dev
  database, confirmed all three status breakdown panels render with
  correctly proportioned progress bars, selected "Acme Corporation" in the
  organization filter and confirmed every count re-scoped to small, exact,
  organization-specific values (Employees: 4, Projects: 2, Tasks: 2,
  Deliverables: 1, Documents: 1) while the global Organizations count
  stayed unscoped as designed, and confirmed zero-filled status rows
  rendered correctly for statuses with no matching records in that
  organization.
