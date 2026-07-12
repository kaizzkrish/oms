# Module 12 — Departments

## Status: Complete

## What was built

`Department` — a business unit inside an `Organization`, optionally
scoped to one of that organization's `Office` locations. Unlike Office,
nothing yet depends on Department (no `_count` relation to expose), so
its entity stays a plain record — the first module in the project where
that simplification was correct rather than a shortcut.

### Data model

- `Department` — belongs to exactly one `Organization` (`onDelete:
  Cascade`), optionally to one of that organization's `Office`s
  (`onDelete: SetNull` — deleting an office doesn't delete its
  departments, it just detaches them back to organization-wide). Name,
  optional code, optional description, full audit columns.
- Uniqueness is scoped to the organization (`@@unique([organizationId,
  name])`), not global and not per-office — two organizations may both
  have an "Engineering" department; a organization may not have two.

### Backend

- **`assertOfficeBelongsToOrganization`** is the one new business rule:
  if a department is created or updated with both `organizationId` and
  `officeId`, the service loads the office and rejects (400) if its
  `organizationId` doesn't match. This is the first module where a
  resource has two parent references that must agree with each other,
  rather than a single parent to validate against.
- `officeId` is nullable and independently updatable — the DTO uses the
  `ValidateIf`-on-presence pattern so `officeId: null` (detach from any
  office) is distinguishable from "field omitted" (leave unchanged) on
  `PATCH`.
- Scoped-uniqueness reuses the Organization module's
  `findByOrganizationAndName` shape (via `DepartmentsRepository`'s
  compound-unique lookup) rather than a plain `findByName` — the same
  pattern Module 11 established for Office's per-organization
  constraints, now confirmed to generalize to a second resource.
- 4 new permissions (`Departments.*`) under a new "Department
  Management" group; Admin gets all four, Team Leader gets `.View`,
  matching the established pattern.

### Frontend

- `DepartmentFormDialog`'s Office select is a **cascading dropdown**:
  `useWatch` on the form's `organizationId` field re-queries
  `useListOfficesQuery` filtered to that organization and disables the
  Office field until an organization is chosen. This is the first
  create/edit form in the project where one field's options depend on
  another field's live value rather than a static list.
- `DepartmentsListPage` follows Offices' full-page-not-modal precedent
  (organization filter dropdown synced to `useSearchParams`, sortable
  table, permission-gated Edit/Delete/Restore). It does not expose a
  separate Office filter control in the UI — the backend's
  `officeId` query filter exists for future cross-linking (e.g. an
  Offices page "department count" link, not built yet) but the initial
  UI only needed the organization filter to be usable.
- Deliberately **not** added: an office/department count column on
  `OrganizationsListPage` or `OfficesListPage`. Every future module
  under Organization (Designations, Employees) would have the same
  claim on that space; adding a count-and-link per child as each one
  ships would make those two pages grow indefinitely. Revisit only if a
  specific workflow needs the shortcut.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (13 new
  cases — create/update/delete/restore, cross-org office validation,
  scoped uniqueness — 142 total), e2e tests (9 new cases — full
  lifecycle, duplicate name blocked within an org, same name allowed
  across orgs, cross-org office rejected, organization/office filtering,
  404s — 43 total).
- Frontend: `tsc -b` (build-mode; caught a real type error —
  `officeId`'s create vs. update null/undefined handling — that
  `tsc --noEmit -p .` silently missed because the frontend's root
  `tsconfig.json` has `"files": []` and only resolves through
  `references`, so non-build-mode invocations type-check nothing),
  `eslint --max-warnings 0`, Vitest (4 new cases — list, empty state,
  create through dialog, delete through confirm dialog — 43 total).
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx. No browser-automation tool was available
  in this session (the agent-browser skill used for Modules 8–11 wasn't
  present here), so end-to-end verification was done by driving the
  actual running stack's HTTP API through nginx (`curl` at
  `http://localhost`, not against the test suite's in-process app):
  logged in as the seeded admin, confirmed `Departments.*` appears in
  `/api/permissions/me`, and exercised create → duplicate-name-rejected
  (409) → cross-org-office-rejected (400) → update → soft-delete →
  excluded from the default list → included under `isActive=false` →
  restore, all against the live containers. This confirms the deployed
  build behaves correctly but is not a substitute for the actual-browser
  UI verification prior modules received — worth re-checking in the
  browser next time the tool is available.
