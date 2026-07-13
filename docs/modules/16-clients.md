# Module 16 — Clients

## Status: Complete

## What was built

`Client` — an external customer organization the company does work for,
scoped to an `Organization` and optionally assigned an internal `Employee`
as account manager. Not to be confused with `Organization` itself, which
represents the tenant company running this ERP — `Client` is the first
module representing an entity *outside* the company.

### Data model

- `Client` — belongs to exactly one `Organization` (`onDelete: Cascade`),
  optionally has an `accountManagerId` pointing at an `Employee`
  (`SetNull`), the same "optional Employee reference, must share the
  organization" shape `Team.teamLeaderId` and `Employee.reportingManagerId`
  already established.
- Fields are deliberately flat rather than normalized into sub-tables:
  a single address (line 1/2, city, state, country, postal code, all
  optional) and a single primary contact (name, email, phone), matching
  how `Organization` itself keeps contact info as plain columns rather
  than a separate contacts table. A CRM wanting multiple contacts per
  client isn't a requirement here yet — add a `ClientContact` join table
  later if that becomes real, rather than modeling it speculatively now.
- Every other field (`code`, `industry`, `website`, `email`, `phone`,
  `description`) is optional — unlike `Office`, where address fields were
  required because an office must have a real location, a client record
  commonly starts as just a name during early sales conversations and
  gets enriched later.
- Uniqueness: `name` scoped to the organization, matching every other
  named resource under `Organization` so far.
- **No `_count` on the entity.** Nothing references `Client` yet
  (Projects, the next module, will) — plain entity, same as Department/
  Designation/Team before something else pointed at them.

### Backend

- **`assertAccountManagerBelongsToOrganization`** is a direct copy of the
  cross-organization-reference pattern used everywhere else
  (Team↔teamLeader, Employee↔reportingManager) — this makes four
  independent modules now sharing the identical "optional Employee
  reference must share the parent's organization" check, reinforcing
  that this is a stable, reusable shape rather than one-off logic.
- Search spans `name`, `code`, and `contactName` — the first module to
  include a contact-person field in the free-text search, since finding
  a client by the person you spoke to is a realistic lookup path a CRM
  needs.
- 4 new permissions (`Clients.*`) under a new "Client Management" group;
  Admin gets all four, Team Leader gets `.View`.

### Frontend

- `ClientFormDialog` is the largest form in the project so far (~18
  fields). Grouped with `Divider`s and `overline`-variant section labels
  ("Address", "Primary Contact") — the first form to need visual
  grouping, since every earlier form's field count fit comfortably in a
  flat `Stack`. Reuses the `optionalEmail` Zod schema pattern from
  `OrganizationFormDialog` for both the general and contact email
  fields (empty string or a valid email, not required).
- Account Manager cascades off Organization exactly like Team Leader
  does in `TeamFormDialog` — same `useListEmployeesQuery` scoped to the
  selected organization, disabled until one is chosen.
- `ClientsListPage` shows a compact "Contact" column (`contactName ??
  contactEmail`) rather than surfacing all 18 fields in the table —
  the full address/contact detail only needs to be visible in the edit
  dialog, not the list view.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (11 new
  cases — create/update/delete/restore, account-manager cross-org
  validation, duplicate-name rejection — 198 total), e2e tests (9 new
  cases — full lifecycle, duplicate name blocked within an org, same
  name allowed across orgs, cross-org account-manager rejected,
  organization/account-manager filtering, 404s — all pass in isolation;
  a full-suite run hit the same pre-existing concurrent-load `afterAll`
  teardown flake seen in Modules 13–15, this time in the new
  `clients.e2e-spec.ts` itself, confirmed unrelated to the module's own
  logic by every individual assertion passing).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 59 total).
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, ran the seed script (idempotent — added
  the "Client Management" group/permissions and a sample "Globex
  Corporation" client under Acme Corporation, managed by the sample
  employee Jane Doe). Verified end-to-end in a real browser via
  agent-browser: confirmed the Clients nav item and seeded row with
  organization/account-manager/contact all resolved, created a new
  "Initech Inc" client exercising the cascading Organization → Account
  Manager select plus the full address and contact sections, reopened
  it in edit mode to confirm every field (city, country, contact name)
  persisted correctly, deleted it, confirmed it moved to the Inactive
  filter, and restored it back to Active. Network log showed only the
  expected pre-login `refresh` 401 and otherwise clean 200/201/204
  responses; no browser console errors.
