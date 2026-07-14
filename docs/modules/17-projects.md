# Module 17 — Projects

## Status: Complete

## What was built

`Project` — the foundational work unit that every later module in the
build order (Modules, Features, Milestones, Sprints, Tasks, Deliverables)
will hang off of. This is the first module that ties together four other
modules at once: a `Project` optionally belongs to a `Client` (who it's
being done for), a `Department` (who's doing it), a `ProjectManager`
(an `Employee` accountable for it), and a `Team` (who's staffing it).

### Data model

- `Project` — belongs to exactly one `Organization` (`onDelete: Cascade`),
  with four independent optional relations, each `SetNull` on delete:
  `clientId → Client`, `departmentId → Department`, `projectManagerId →
  Employee` (relation name `"ProjectManager"`, since `Employee` already
  has other named self/foreign relations), and `teamId → Team`. All four
  reuse the "optional reference must share the project's organization"
  check, now proven out across five different target types
  (Employee/Team/Client before this, Client/Department/Employee/Team
  here).
- `status` and `priority` are plain strings validated with `@IsIn`
  against `PROJECT_STATUSES`/`PROJECT_PRIORITIES` constants — same
  string-not-enum convention as `Employee.employmentType`, chosen so
  adding a new status later is a constants-file change, not a migration.
- **First use of `Decimal` in the project**: `budget Decimal? @db.Decimal(14,
  2)`. Prisma returns `Decimal` instances for this type, which don't
  serialize to JSON as plain numbers, so `ProjectEntity.fromPrisma`
  explicitly converts it (`project.budget === null ? null :
  Number(project.budget)`) before the entity reaches the controller.
- **First business-rule validation beyond cross-organization checks**:
  `assertDateRangeValid` rejects `endDate < startDate` with a
  `BadRequestException`. On update, the "effective" start/end date is
  resolved from whichever of (existing value, DTO value, explicit null)
  applies before the comparison runs, reusing the undefined/null/value
  three-way logic already established for nullable-clearable fields.
- Uniqueness: `name` scoped to the organization, matching every other
  named resource.

### Backend

- `ProjectsService` injects five other services
  (`OrganizationsService`, `ClientsService`, `DepartmentsService`,
  `EmployeesService`, `TeamsService`) — the most cross-module
  dependencies of any service so far, a direct consequence of Projects
  sitting at the intersection of four other domains.
- Search spans `name` and `code`.
- 4 new permissions (`Projects.*`) under a new "Project Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `ProjectFormDialog` cascades a single `organizationId` selection into
  four independent child queries (Client/Department/Project Manager/
  Team), the widest fan-out of the cascading-select pattern used since
  `EmployeeFormDialog`. Status and priority render as a side-by-side
  `Stack direction="row"` pair of selects; start/end dates and budget
  follow as plain fields, with a Zod `.refine()` on the form schema
  enforcing the same end-after-start rule as the backend so invalid
  ranges are caught before the request is even sent.
- `ProjectsListPage` adds two enum-based filters (Project Status,
  Priority) on top of the usual organization/active filters, and colors
  the status/priority chips per value (e.g. `COMPLETED` → green,
  `CRITICAL` → red) rather than the plain active/inactive two-tone chip
  every earlier list page used — the first list page with more than one
  color-coded chip column.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (15 new
  cases — create/update/delete/restore, cross-org rejection for all four
  relations, end-date-before-start-date rejection on both create and
  update — 213 total), e2e tests (13 new cases — full lifecycle,
  duplicate name blocked within an org, same name allowed across orgs,
  all four cross-org relation rejections in one test, invalid date range
  rejected, organization/client filtering, 404s — all pass in isolation;
  a full-suite run hit the same pre-existing concurrent-load `afterAll`
  teardown flake seen in prior modules, this time in
  `permissions.e2e-spec.ts`, confirmed unrelated by the suite passing
  8/8 in isolation).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 63 total), production `vite build`.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, confirmed the seed script's sample
  "Website Redesign" project (Globex Corporation / Engineering /
  IN_PROGRESS / HIGH / $50,000 budget) via the live API. Verified
  end-to-end in a real browser via agent-browser: confirmed the Projects
  nav item and seeded row with client/department/manager all resolved,
  created a new "Mobile App Launch" project exercising all four
  cascading selects plus status/priority/dates/budget, edited it
  (status → Completed, priority → Critical) and confirmed the change
  reflected in the list, confirmed the end-before-start date validation
  blocks submission client-side with no network request fired, deleted
  it, confirmed it moved to the Inactive filter, and restored it back to
  Active. Network log showed only the expected 201/200/204/204
  responses; no browser console errors.
