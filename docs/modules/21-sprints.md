# Module 21 — Sprints

## Status: Complete

## What was built

`Sprint` — a time-boxed Scrum iteration scoped to a `Project`, optionally
staffed by a `Team` and facilitated by a Scrum Master (`Employee`). Like
Milestones, Sprints attach directly to `Project` rather than nesting
under a `ProjectModule` — an agile team runs sprints across the whole
project's backlog, not confined to one module, so the parent choice
follows the same domain reasoning Milestones established.

### Data model

- `Sprint` — belongs to exactly one `Organization` and `Project` (both
  `onDelete: Cascade`, both required). `teamId → Team` (optional,
  `SetNull`) and `scrumMasterId → Employee` (optional, `SetNull`) are
  both new optional relations reusing the familiar "must share the
  organization" assert pattern — `assertTeamBelongsToOrganization` is a
  direct copy of the check `ProjectsService` already used for its own
  optional `teamId`, now reused a second time from a different module.
- **First WBS entity with a field named `goal` instead of
  `description`** — deliberately using genuine Scrum terminology (the
  "Sprint Goal" is an official Scrum artifact) rather than reusing the
  generic free-text field name every other entity has used. Same
  `MaxLength(500)` free-text shape underneath, but named for what it
  actually represents in this domain.
- **First entity since Project itself with *two* required dates
  forming a real range** — `startDate` and `endDate` are both mandatory
  (unlike Project/Module/Feature, where both are optional, and unlike
  Milestone, which has one mandatory point-in-time `dueDate`). A sprint
  is fundamentally a fixed time-box, so leaving either date out doesn't
  produce a meaningful sprint. `assertDateRangeValid` is reused
  unchanged; on update, since neither date can be cleared to null, the
  "effective" date resolution is simpler than Project's three-way
  undefined/null/value logic — just `dto.startDate ? new Date(...) :
  existing.startDate`.
- `status` is its own set — `PLANNING / ACTIVE / COMPLETED / CANCELLED`
  — the same four states Project could use if it didn't also need
  `ON_HOLD`; a sprint is short enough that pausing mid-flight isn't a
  real scenario the way it is for a multi-month project.
- Uniqueness scoped to the project: `@@unique([projectId, name])`,
  matching every other project-scoped WBS entity.

### Backend

- `SprintsService` injects `OrganizationsService`, `ProjectsService`,
  `TeamsService`, and `EmployeesService` — the same shape as
  `ProjectsService` itself (which also validates an optional Team
  reference), just one module further down the chain.
- Search spans `name` and `code`.
- 4 new permissions (`Sprints.*`) under a new "Sprint Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `SprintFormDialog` cascades `organizationId` into three child queries
  (Project, Team, Scrum Master) — Team and Scrum Master both scope off
  the organization directly rather than the project, since `Team` is an
  organization-level entity that predates Projects in the build order.
  Reuses the client-side `.refine()` end-after-start Zod rule, now
  applied to two *required* date fields instead of two optional ones.
- `SprintsListPage` defaults its sort to Start Date ascending — like
  Milestones' due-date default, a sprint list is naturally read in
  chronological order — and colors status chips with `ACTIVE` = info,
  `COMPLETED` = success, matching the semantic weight of each state.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (16 new
  cases — create/update/delete/restore, organization/project existence
  and membership validation, team and scrum-master cross-org
  validation, duplicate-name-within-project rejection, reassigned-
  project validation, end-date-before-start-date rejection on both
  create and update — 275 total), e2e tests (12 new cases — full
  lifecycle, duplicate name blocked within a project, same name allowed
  across projects, cross-org project/team/scrum-master rejection,
  invalid date range rejected, organization/project filtering, 404s —
  all 16 e2e suites and 137 tests passed; one run hit the same
  pre-existing concurrent-load `afterAll` teardown flake seen in prior
  modules, this time in `features.e2e-spec.ts`, confirmed unrelated by
  the suite passing 12/12 in isolation).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 79 total, no flake this run), production
  `vite build`.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, confirmed the seed script's sample
  "Sprint 1" (Website Redesign project / Engineering Team / Jane Doe
  scrum master / ACTIVE / Jan 13–27 2026) via the live API. Verified
  end-to-end in a real browser via agent-browser: confirmed the Sprints
  nav item and seeded row with project/team/scrum-master all resolved,
  used the Organization → Project filter cascade to scope the list,
  created a new "Sprint 2" exercising all three cascading selects plus
  status/dates/goal, edited it (status → Completed) and confirmed the
  change reflected in the list, deleted it, confirmed it moved to the
  Inactive filter, and restored it back to Active. Network log showed
  only the expected 201/200/204/200 responses; no browser console
  errors.
