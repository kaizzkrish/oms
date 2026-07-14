# Module 18 — Modules

## Status: Complete

## What was built

`ProjectModule` — the first level of work breakdown inside a `Project`,
representing a functional component or area of scope (e.g. "Checkout
Flow", "Homepage Revamp"). This is the entity the remaining build-order
modules attach to or descend from: Features, Milestones, Sprints, Tasks,
and Deliverables all exist in the context of a project's modules (or the
project itself).

Named `ProjectModule` in code (table `project_modules`, route
`/project-modules`, permissions `ProjectModules.*`) rather than plain
`Module` — this codebase already has dozens of NestJS classes named
`XxxModule` for dependency injection, and naming the entity class `Module`
would collide with that vocabulary everywhere from imports to error
messages. The UI-facing label is still the plain "Modules" the build
order specifies; the disambiguation is a backend/routing-only concern.

### Data model

- `ProjectModule` — belongs to exactly one `Organization` (`onDelete:
  Cascade`) **and** exactly one `Project` (`onDelete: Cascade`, required
  — not optional like every other parent/peer reference introduced so
  far). A module cannot outlive its project, so both cascade together;
  contrast with `Project.clientId`/`departmentId`/etc., which are
  optional peer links that merely `SetNull` when the referenced row is
  removed.
- `moduleLeadId → Employee` (optional, `SetNull`) reuses the now-familiar
  "optional Employee reference must share the organization" shape, this
  time validated via a new `assertModuleLeadBelongsToOrganization`.
- **First entity whose uniqueness scope is its parent record instead of
  the organization**: `@@unique([projectId, name])`, not
  `[organizationId, name]`. Two different projects in the same
  organization can each have a module named "Backend" — the name only
  needs to be unique *within* a project, mirroring how the MASTER_PROMPT
  build order treats Project as the true tenant boundary for everything
  beneath it. `ProjectModulesRepository.findByProjectAndName` replaces
  the `findByOrganizationAndName` helper every earlier module used.
- `status` is a plain string validated via `@IsIn(MODULE_STATUSES)` —
  same five values as `Project.status` (`PLANNING`/`IN_PROGRESS`/
  `ON_HOLD`/`COMPLETED`/`CANCELLED`), but declared as its own constants
  file rather than reusing Project's, keeping the two entities
  independently extensible. No `priority` field — that judgment call
  belongs to the project as a whole, not each of its modules.
- Reuses the exact `assertDateRangeValid` end-after-start rule
  introduced in Projects, unchanged.

### Backend

- `ProjectModulesService` injects `OrganizationsService`,
  `ProjectsService`, and `EmployeesService`. `createProjectModule`
  validates the organization exists, then that the given project both
  exists and belongs to that organization
  (`assertProjectBelongsToOrganization`, a required-relation variant of
  the optional-relation asserts used everywhere else), mirroring the
  same "only re-validate when the field is actually supplied" update
  behavior Project established for its peer relations — now applied to
  `projectId` itself, since a module's project can be reassigned.
- Search spans `name` and `code`.
- 4 new permissions (`ProjectModules.*`) under a new "Module Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `ProjectModuleFormDialog` cascades `organizationId` into two child
  queries (Project, Module Lead) — narrower fan-out than Project's own
  four-way cascade, reflecting that a module only needs to know its
  project and an optional owner. Reuses the same client-side
  `.refine()` end-after-start Zod rule as `ProjectFormDialog`.
- `ProjectModulesListPage` adds a **Project filter that itself narrows
  by the selected Organization filter** — the first list page where one
  filter dropdown's options depend on another filter's value, not just
  on the create-dialog's cascading selects. Selecting an organization
  resets any previously chosen project filter to avoid an inconsistent
  combination.
- Status chip coloring matches Project's scheme
  (`PLANNING`=default, `IN_PROGRESS`=info, `ON_HOLD`=warning,
  `COMPLETED`=success, `CANCELLED`=error) for visual consistency between
  the two related list pages.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (15 new
  cases — create/update/delete/restore, project-must-exist-and-belong-
  to-org, module-lead cross-org validation, duplicate-name-within-project
  rejection, reassigned-project cross-org validation, end-date-before-
  start-date rejection — 228 total), e2e tests (11 new cases — full
  lifecycle, duplicate name blocked within a project, same name allowed
  across projects, cross-org project rejection, cross-org module-lead
  rejection, invalid date range rejected, organization/project
  filtering, 404s — all 13 e2e suites and 103 tests passed cleanly with
  no teardown flake this run).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 67 total), production `vite build`.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, confirmed the seed script's sample
  "Homepage Revamp" module (Website Redesign project / Jane Doe lead /
  IN_PROGRESS) via the live API. Verified end-to-end in a real browser
  via agent-browser: confirmed the Modules nav item and seeded row with
  project/module-lead all resolved, used the Organization → Project
  filter cascade to scope the list, created a new "Checkout Flow" module
  with the create dialog's organization/project pre-filled from the
  active filters, edited it (status → Completed) and confirmed the
  change reflected in the list, deleted it, confirmed it moved to the
  Inactive filter, and restored it back to Active. Network log showed
  only the expected 201/200/204/200 responses; no browser console
  errors.
