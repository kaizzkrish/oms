# Module 14 — Employees

## Status: Complete

## What was built

`Employee` — the HR profile for a person who works at an `Organization`,
linked 1:1 to the `User` account they log in with. This is the first
module where a resource wraps an existing entity (`User`) rather than
standing alone, and the first with a self-relation used for a business
hierarchy (`reportingManagerId`) rather than an audit trail.

### Data model

- `Employee` — `userId` is `@unique` (one employee profile per login
  account), `onDelete: Cascade`. Belongs to exactly one `Organization`
  (`Cascade`), optionally to a `Department`, `Designation`, and `Office`
  (all three `SetNull` — same "detach, don't delete" rule as every
  earlier optional-scope relation), and optionally reports to another
  `Employee` (`reportingManagerId`, self-relation, `SetNull`).
  `employeeCode`, `employmentType` (a validated string —
  `FULL_TIME`/`PART_TIME`/`CONTRACT`/`INTERN` — not a native Prisma
  enum, matching the project's enum-free convention so far),
  `dateOfJoining` (required), `dateOfLeaving` (optional), `phone`, full
  audit columns.
- Uniqueness: `employeeCode` is scoped to the organization
  (`@@unique([organizationId, employeeCode])`), the same shape as
  Department/Designation names — two organizations can each have an
  "EMP-0001", one organization cannot have two.
- **`userId` is immutable after creation** — deliberately left out of
  `UpdateEmployeeDto` entirely. Re-pointing an employee profile at a
  different login account isn't a real operation this system needs, and
  leaving the door open would mean reasoning about what happens to the
  old and new user's history; narrower is safer here.

### Backend

- **Four parent relations to validate, not one.** `createEmployee`/
  `updateEmployee` run up to four `assertXBelongsToOrganization` checks
  (department, designation, office, reporting manager) — each a direct
  copy of the Department/Designation precedent, confirming that pattern
  scales to a resource with several optional scopes instead of just one
  or two.
- **Reporting-manager guards**: creating or updating an employee with a
  `reportingManagerId` checks the manager exists and belongs to the same
  organization (reusing the assert pattern), plus one new rule —
  `updateEmployee` rejects `reportingManagerId === id` (an employee
  managing themselves) before anything else runs. Deeper cycle detection
  (A manages B manages A) is deliberately out of scope; the direct
  self-reference is the case actually worth guarding against here, and a
  full graph walk isn't justified by anything the next modules need.
- **`EmployeesRepository` embeds the linked `User`** via a `WITH_USER`
  Prisma `include` (`id`/`firstName`/`lastName`/`email`/`isActive`
  only — never `passwordHash`), exposed as `EmployeeWithUser` /
  `EmployeeEntity.user`. This is the first module to embed a full nested
  relation object rather than a `_count` aggregate (Organization/
  PermissionGroup) — justified because the employee's identity *is* the
  linked user, unlike Department/Designation/Office's parent names,
  which the frontend already resolves itself via list-and-lookup-map
  (kept that way here too for organization/department/designation/office
  names — only the 1:1 user identity gets embedded).
- Search spans both the employee's own `employeeCode` and the joined
  user's `firstName`/`lastName`/`email` via a nested Prisma `OR`
  (`{ user: { OR: [...] } }`) — the first module whose search crosses a
  relation boundary.
- 4 new permissions (`Employees.*`) under a new "Employee Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `EmployeeFormDialog` cascades **four** fields off the chosen
  Organization (Department, Designation, Office, Reporting Manager),
  extending the two-field cascade Departments/Designations established.
  The Reporting Manager options come from `useListEmployeesQuery`
  filtered to the selected organization, with the employee being edited
  filtered out of its own candidate list client-side (belt-and-braces
  alongside the backend's self-reference rejection).
- **The User field only appears as a picker in create mode.** In edit
  mode it renders as static text (`user.firstName user.lastName
  (user.email)`), matching the backend's immutable-`userId` rule —
  there's no control that could submit a userId change in the first
  place, rather than a control that's merely disabled.
- `EmployeesListPage` fetches four reference lists (organizations,
  departments, designations, offices) purely to build client-side
  name-lookup maps for the table, the same pattern Departments/
  Designations used for one or two relations, now confirmed to scale to
  four without needing a different approach.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (16 new
  cases — create/update/delete/restore, all four cross-org relation
  validations, duplicate-user-profile rejection, duplicate-employee-code
  rejection, self-reporting-manager rejection — 169 total), e2e tests
  (10 new cases — full lifecycle including the embedded `user` object in
  the response, one-employee-profile-per-user enforcement, duplicate
  code within an org, cross-org department rejection, self-manager
  rejection, organization/department filtering, 404s — all pass in
  isolation; a full-suite run hit the same pre-existing concurrent-load
  `afterAll` teardown flake as Module 13, this time in
  `roles.e2e-spec.ts`, confirmed unrelated).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list with all relation names resolved, empty state, create
  through dialog, delete through confirm dialog — 51 total).
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, ran the seed script (idempotent — added
  the "Employee Management" group/permissions, a new `employee@oms.local`
  login with the Employee role, and a sample "Jane Doe / EMP-0001"
  profile under Acme Corporation / Engineering / Software Engineer /
  Headquarters). Verified end-to-end in a real browser via agent-browser:
  logged in as the seeded admin, confirmed the Employees nav item and
  seeded row with every relation name resolved correctly, created a
  second employee (linking the existing `admin@oms.local` login,
  selecting Acme Corporation, watching Department/Designation/Office/
  Reporting-Manager unlock and populate correctly, and setting Jane Doe
  as reporting manager), edited it back open to confirm the User field
  rendered as read-only text and the reporting manager persisted,
  deleted it, confirmed it moved to the Inactive filter, and restored it
  back to Active. Network log showed only the expected pre-login
  `refresh` 401 and otherwise clean 200/201/204 responses; no browser
  console errors.
