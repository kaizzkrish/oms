# Module 11 — Organizations

## Status: Complete

## What was built

The first "real" business-domain module (Steps 1–10 were the auth/RBAC
foundation): `Organization` (the company entity) and `Office` (its
branch/location sub-entity — mentioned separately from Organization in
the architecture decisions' seed-data list, but not a standalone
MASTER_PROMPT module, so it's built here as Organization's dependent
resource rather than deferred to its own step).

Unlike Roles/Permissions, neither model has an `isSystem` concept —
nothing in the codebase references a specific organization or office by
name, so there's nothing to protect. The seed script creates exactly one
sample of each ("Acme Corporation" / "Headquarters"), the same way the
admin user is seeded, not as a protected default.

### Data model

- `Organization` — name (unique), legal name, registration number,
  industry, website, email, phone, logo URL, full audit columns.
- `Office` — belongs to exactly one `Organization` (`onDelete: Cascade`
  — deleting an organization's row structurally removes its offices,
  though in practice the service layer always blocks that first via the
  office-count guard below), `isHeadquarters` flag, full address fields
  (`addressLine1` and `city`/`country` required, everything else
  optional), full audit columns.

### Backend

- **`OrganizationsRepository`**'s office count (`_count.offices`) is
  filtered to `deletedAt: null` from the start — Module 10's bug
  (soft-deleted rows inflating an unfiltered `_count`) is now a
  documented gotcha, applied proactively here instead of rediscovered.
- **Single-headquarters-per-organization** is enforced by
  `OfficesService`, not a DB constraint (Prisma/Postgres can't express a
  partial unique index without raw SQL, which MASTER_PROMPT disallows):
  creating or updating an office with `isHeadquarters: true` unsets the
  flag on every other office in the same organization
  (`unsetOtherHeadquarters`). Verified in both the unit tests (repository
  call assertions) and an e2e test that creates two offices marked as
  headquarters and confirms the first one's flag flipped off.
- **`OfficesService.createOffice`/`updateOffice`** call
  `OrganizationsService.getOrganizationOrThrow` before touching
  anything — an office can never reference a nonexistent or (once
  Department exists) orphaned organization. `OfficesModule` imports
  `OrganizationsModule` for this, the same dependency shape as
  `RolesModule` → `UsersModule`/`PermissionsModule`.
- 8 new permissions (`Organizations.*`, `Offices.*`) under a new
  "Organization Management" permission group; Admin gets all, Team
  Leader gets the two `.View` ones, matching the established pattern.
- `GET /offices?organizationId=X` — the only new query-filter shape
  this module introduces; every other filter (search, `isActive`) reuses
  the Module 08 pagination base.

### Frontend

- **Offices got a full top-level page, not a Roles-style modal.** The
  Roles↔Users/Permissions sub-resource dialogs work well for a compact
  join-table list (name + remove button), but an office carries ~10
  real fields (full address, contact info, HQ flag) — cramming that into
  a list-item-in-a-dialog would either truncate the useful information
  or require the dialog to basically become the same table again. Instead,
  Organizations' row shows an office *count* button that navigates to
  `/offices?organizationId=X` (via `useNavigate` + `useSearchParams`),
  landing on the full Offices page pre-filtered to that organization —
  first use of URL query-param state in this project; every earlier
  cross-entity link used an in-page dialog instead.
- `OfficeFormDialog` resolves the Organization select from
  `useListOrganizationsQuery`, and defaults to the currently active
  Offices-page organization filter when creating a new office from
  there (`defaultOrganizationId`), so "New Office" from the org's
  filtered Offices view doesn't force re-picking the same organization.
- Nav/action gating follows the established `useHasPermission()` pattern
  (`Organizations.*`/`Offices.*`), and `createOffice`/`deleteOffice`/
  `restoreOffice` also invalidate the `Organization` list tag so a
  changed office count is reflected on the Organizations page without a
  manual refetch.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (23 new
  cases across Organizations/Offices services, including the
  headquarters-uniqueness and organization-existence-check paths — 131
  total), e2e tests (8 new cases: organization lifecycle blocked by
  offices, headquarters uniqueness across two offices, filtering offices
  by organization, 404s for both resources and for creating an office
  under a nonexistent organization — 34 total).
- Frontend: `tsc -b && vite build`, `eslint --max-warnings 0`, Vitest (8
  new cases across the two list pages, including a create-through-dialog
  test exercising the Organization `<select>` inside the office form —
  39 total).
- Rebuilt the Docker backend and frontend images and drove the actual
  browser at `http://localhost`: confirmed the seeded "Acme Corporation"
  organization shows its one seeded office; clicked its office count and
  landed on the Offices page correctly pre-filtered and with the
  Organization `<select>` in the New Office dialog already defaulted to
  Acme Corporation; created a second office marked as headquarters and
  confirmed the *first* office's "HQ" badge disappeared from the table
  live, without a page reload — the single-headquarters rule verified
  end-to-end, not just at the API layer. Network log showed only the
  expected pre-login 401 and otherwise clean 200/201/204 responses.
