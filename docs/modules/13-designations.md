# Module 13 — Designations

## Status: Complete

## What was built

`Designation` — a job title inside an `Organization`, optionally scoped
to one of that organization's `Department`s. Structurally this is the
same shape as Module 12's Department (an `Organization` child with an
optional narrower parent), just one level deeper: Designation's optional
parent is Department instead of Office.

### Data model

- `Designation` — belongs to exactly one `Organization` (`onDelete:
  Cascade`), optionally to one of that organization's `Department`s
  (`onDelete: SetNull` — deleting a department detaches its designations
  back to organization-wide rather than deleting them). Name, optional
  code, optional description, full audit columns.
- Uniqueness is scoped to the organization (`@@unique([organizationId,
  name])`), matching Department's rule: two organizations may each have
  a "Software Engineer" designation; one organization may not have two.

### Backend

- **`assertDepartmentBelongsToOrganization`** mirrors Department's
  `assertOfficeBelongsToOrganization` exactly: if both `organizationId`
  and `departmentId` are given, the service loads the department via
  `DepartmentsService.getDepartmentOrThrow` and rejects (400) if its
  `organizationId` doesn't match. `DesignationsModule` imports
  `DepartmentsModule` for this, the same one-level-up dependency chain
  Department has on Offices/Organizations.
- Everything else — repository shape, scoped-uniqueness lookup,
  soft-delete/restore, the `isActive`-filter-vs-`deletedAt` interaction —
  is a direct copy of Department's pattern. No new backend problem
  showed up in this module; it's confirmation that the Department shape
  generalizes cleanly to a second "optional narrower scope" resource
  rather than a one-off.
- 4 new permissions (`Designations.*`) under a new "Designation
  Management" group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `DesignationFormDialog` reuses the cascading-select pattern from
  `DepartmentFormDialog` verbatim, swapping Office for Department:
  `useWatch` on `organizationId` re-queries `useListDepartmentsQuery`
  filtered to that organization, and the Department field stays disabled
  until an organization is chosen.
- `DesignationsListPage` follows the same full-page structure as
  `DepartmentsListPage` (organization filter synced to `useSearchParams`,
  sortable table, permission-gated actions). Also intentionally has no
  Organizations/Departments-page count-and-link back to Designations,
  for the same reason Module 12 gave: that space doesn't scale to one
  link per descendant module.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (11 new
  cases — create/update/delete/restore, cross-org department validation,
  scoped uniqueness — 153 total), e2e tests (9 new cases — full
  lifecycle, duplicate name blocked within an org, same name allowed
  across orgs, cross-org department rejected, organization/department
  filtering, 404s — all pass in isolation; a full-suite run hit an
  unrelated `afterAll` hook timeout in the pre-existing
  `permissions.e2e-spec.ts` under concurrent-suite load, confirmed a
  resource-contention flake and not a regression by re-running that
  suite alone).
- Frontend: `tsc -b --force` (build-mode, per the Module 12 lesson —
  `tsc --noEmit -p .` would silently check nothing here),
  `eslint --max-warnings 0`, Vitest (4 new cases — list, empty state,
  create through dialog, delete through confirm dialog — 47 total).
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, ran the seed script (idempotent — created
  only the new "Designation Management" group/permissions and the
  sample "Software Engineer" designation under Acme Corporation /
  Engineering). The agent-browser skill was available this session (it
  wasn't in Module 12), so verification went through the actual browser
  at `http://localhost` this time: logged in as the seeded admin,
  confirmed the Designations nav item and seeded row, created an
  organization-wide "QA Tester" designation, edited it to attach the
  Engineering department via the cascading select and confirmed the
  table updated live, deleted it, confirmed it moved to the Inactive
  filter view, and restored it back to Active — all through real UI
  interactions, not API calls. Network log showed only the expected
  pre-login `refresh` 401 and otherwise clean 200/201/204 responses; no
  browser console errors.
