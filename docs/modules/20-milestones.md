# Module 20 — Milestones

## Status: Complete

## What was built

`Milestone` — a project-level checkpoint marking a target date (e.g.
"Beta Launch", "Public Launch"). Unlike Modules and Features, which
nest strictly one level deeper each time (`Project → ProjectModule →
Feature`), Milestones deliberately attach directly to `Project` rather
than to a `ProjectModule` or `Feature` — the same way GitHub milestones
are repo-scoped and Jira versions are project-scoped, not tied to a
single epic. A milestone typically marks a checkpoint that cuts across
several modules at once (a beta launch touches many parts of a
project), so nesting it under one module would misrepresent what it
is. This is the first entity in the build order whose parent is chosen
by domain reasoning rather than by mechanically extending the previous
module's nesting depth.

### Data model

- `Milestone` — belongs to exactly one `Organization` and `Project`
  (both `onDelete: Cascade`, both required, `organizationId` stored
  directly for query convenience as established since `ProjectModule`).
  `ownerId → Employee` (optional, `SetNull`) reuses the familiar
  "optional Employee reference must share the organization" shape.
- **First entity with genuinely different status semantics** from
  every work-item entity before it. Project/ProjectModule/Feature all
  share `PLANNING → IN_PROGRESS → ON_HOLD → COMPLETED/CANCELLED`,
  modeling a *span* of work. A milestone isn't a span, it's a single
  point in time, so `MILESTONE_STATUSES` is its own set:
  `PENDING / AT_RISK / ACHIEVED / MISSED / CANCELLED` — no
  "IN_PROGRESS" (a milestone hasn't partially happened), but "AT_RISK"
  captures the one thing genuinely unique to date-driven checkpoints:
  the target is in jeopardy of slipping.
- **First entity with two dates instead of a start/end range**:
  `dueDate` (required — a milestone's entire purpose is its target
  date, so unlike every prior entity's optional `startDate`/`endDate`,
  this field is mandatory on create) and `achievedDate` (optional,
  nullable, set independently when the milestone is actually hit).
  There's deliberately no cross-field validation between them — a
  milestone can be achieved before or after its due date, both are
  valid outcomes worth recording, so no `assertDateRangeValid`-style
  rule applies here.
- Uniqueness scoped to the project: `@@unique([projectId, name])`,
  matching `ProjectModule`'s precedent (two different projects can each
  have a "Beta Launch" milestone).
- **First entity whose default sort field isn't `name`**:
  `QueryMilestonesDto.sortBy` defaults to `dueDate`, since the natural
  way to view a list of milestones is chronological (what's coming up
  next), not alphabetical.

### Backend

- `MilestonesService` injects `OrganizationsService`, `ProjectsService`,
  and `EmployeesService` — one level shallower than `FeaturesService`,
  since there's no module in the chain to validate through. Reuses the
  `assertProjectBelongsToOrganization` / `assertOwnerBelongsToOrganization`
  shapes exactly.
- Search spans `name` and `code`.
- 4 new permissions (`Milestones.*`) under a new "Milestone Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `MilestoneFormDialog` cascades `organizationId` into two child
  queries (Project, Owner) — the same width as `ProjectModuleFormDialog`,
  reflecting that Milestones sit at the Project level rather than
  needing a third cascade level like Features did. Due Date and
  Achieved Date render side-by-side with no cross-field Zod refinement,
  unlike every prior date-pair field.
- `MilestonesListPage` defaults its sort to Due Date ascending (not
  Name), matching the backend default, and its Milestone Status chip
  coloring reflects the new semantics directly: `AT_RISK` = warning,
  `ACHIEVED` = success, `MISSED`/`CANCELLED` = error — a "missed"
  milestone is treated as visually equivalent in severity to a
  cancelled one, both signaling the target didn't happen as planned.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (13 new
  cases — create/update/delete/restore, organization/project existence
  and membership validation, owner cross-org validation, duplicate-
  name-within-project rejection, reassigned-project validation — 259
  total), e2e tests (10 new cases — full lifecycle including setting
  `achievedDate` on update, duplicate name blocked within a project,
  same name allowed across projects, cross-org project rejection,
  cross-org owner rejection, organization/project filtering, 404s —
  all 15 e2e suites and 125 tests passed cleanly with no teardown
  flake this run).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 75 total), production `vite build`. One unrelated
  pre-existing test (`FeaturesListPage.test.tsx`, written in Module 19)
  timed out under full-suite concurrent load but passed 100% in two
  separate isolated re-runs — the same category of concurrent-load
  flake already documented for backend e2e teardown hooks, now also
  appearing on the frontend side as the suite count grows; not related
  to Milestones and not chased further.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, confirmed the seed script's sample
  "Beta Launch" milestone (Website Redesign project / Jane Doe owner /
  AT_RISK / due 2026-04-30) via the live API. Verified end-to-end in a
  real browser via agent-browser: confirmed the Milestones nav item and
  seeded row with project/owner all resolved, used the Organization →
  Project filter cascade to scope the list, created a new "Public
  Launch" milestone exercising both cascading selects plus owner/
  status/due date, edited it (status → Achieved, set an achieved date)
  and confirmed the change reflected in the list, deleted it, confirmed
  it moved to the Inactive filter, and restored it back to Active.
  Network log showed only the expected 201/200/204/200 responses; no
  browser console errors.
