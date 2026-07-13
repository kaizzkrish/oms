# Module 15 — Teams

## Status: Complete

## What was built

`Team` — a working group of `Employee`s inside an `Organization`, optionally
scoped to a `Department` and optionally led by one `Employee` (`teamLeaderId`).
This is the first module in the project with a genuine **many-to-many**
relationship (`TeamMember` joining `Team` and `Employee`), following the
same join-table + sub-resource pattern Module 9 (Roles) established for
Role↔User and Role↔Permission — the first confirmation that pattern
generalizes past its original two uses.

### Data model

- `Team` — belongs to exactly one `Organization` (`onDelete: Cascade`),
  optionally to one `Department` and optionally led by one `Employee`
  (both `SetNull` — the familiar "detach, don't delete" rule). Name,
  optional code, optional description, full audit columns. Uniqueness is
  scoped to the organization, matching every other named resource under
  Organization so far.
- `TeamMember` — pure join table (`teamId`, `employeeId`, `joinedAt`,
  `addedBy`), `@@unique([teamId, employeeId])`, both FKs `onDelete:
  Cascade`. No extra fields on the membership itself (no per-member role
  like "Lead" vs "Member") — `Team.teamLeaderId` already captures
  leadership, and nothing yet needs a richer membership record.

### Backend

- **`assertTeamLeaderBelongsToOrganization`** mirrors the established
  cross-relation pattern exactly, this time checking an `Employee`
  instead of another org-scoped resource.
- **Membership sub-resource** (`/teams/:id/members`) copies
  `RolesController`/`RolesService`'s shape line for line:
  `GET` (paginated list), `POST /:employeeId` (add), `DELETE
  /:employeeId` (remove) — each gated by a dedicated
  `Teams.ManageMembers` permission separate from `Teams.Update`, exactly
  like Roles split `Roles.ManageUsers`/`Roles.ManagePermissions` from
  `Roles.Update`.
- **`addMember` cross-org guard**: an employee can only join a team in
  their own organization — checked against `team.organizationId`, not
  the team's department (a team can be organization-wide with no
  department, so scoping to department would be wrong).
- **Delete blocked while members remain**, the same rule Roles applies
  to `_count.userRoles` — `TeamsRepository`'s `WITH_MEMBER_COUNT`
  (`_count.select.members`) mirrors `RolesRepository`'s
  `WITH_USER_COUNT` exactly. Verified in the browser: attempting to
  delete a team with one member returns 409 and the confirm dialog stays
  open with the error rather than closing, so the user can immediately
  remove the member and retry.
- **`findMembersForTeam`** returns full `EmployeeWithUser` records (the
  same joined-user shape Module 14 introduced), not bare `TeamMember`
  rows — the members list needed names/emails, and re-querying
  `Employee` with `teamMemberships: { some: { teamId } }` (mirroring
  `RolesRepository.findUsersForRole`'s `userRoles: { some: { roleId } }`)
  gets that for free instead of joining through the thin `TeamMember`
  table.
- 5 new permissions (`Teams.*` — View/Create/Update/Delete/
  ManageMembers) under a new "Team Management" group; Admin gets all
  five, Team Leader gets `.View` only, matching the established pattern
  (the "Team Leader" *role* and `Team.teamLeaderId` are unrelated
  concepts that happen to share a name — the role doesn't currently
  grant any extra team-specific access beyond that `.View`).

### Frontend

- `TeamFormDialog` cascades two fields off Organization (Department,
  Team Leader) — the Team Leader options come from `useListEmployeesQuery`
  scoped to the selected organization, reusing the same "Employee select
  scoped to org" building block Module 15's own membership dialog and
  Module 14's reporting-manager picker both need.
- `TeamMembersDialog` is a near-verbatim copy of `RoleUsersDialog`
  (Autocomplete search-and-add + removable list), the first reuse of
  that component shape for a relationship that isn't Role↔User or
  Role↔Permission — confirms the pattern was worth generalizing instead
  of being Roles-specific. The employee search is scoped to
  `team.organizationId` (Roles' user search has no such scoping, since
  any user can hold any role).
- `TeamsListPage` adds a "Manage Members" row action (opens
  `TeamMembersDialog`) alongside the usual Edit/Delete/Restore, and
  fetches organizations/departments/employees purely for client-side
  name-lookup maps, the same pattern used since Module 12.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (18 new
  cases — create/update/delete/restore, team-leader and department
  cross-org validation, delete-blocked-by-members, add/remove-member
  validations including inactive-team and cross-org-employee rejection,
  duplicate-membership rejection — 187 total), e2e tests (11 new cases
  — full lifecycle, duplicate name blocked within an org, same name
  allowed across orgs, cross-org department/leader rejected, full
  membership lifecycle including duplicate-add (409), cross-org add
  (400), delete-blocked-with-members (409), remove then delete
  succeeding, organization/department filtering, 404s — all pass in
  isolation; a full-suite run hit the same pre-existing concurrent-load
  `afterAll` teardown flake seen in Modules 13–14, this time in
  `departments.e2e-spec.ts`, confirmed unrelated).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 55 total).
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, ran the seed script (idempotent — added
  the "Team Management" group/permissions and a sample "Engineering
  Team" under Acme Corporation / Engineering, led by and containing the
  sample employee Jane Doe). Verified end-to-end in a real browser via
  agent-browser: confirmed the Teams nav item and seeded row with every
  relation resolved, created a "QA Team" exercising the cascading
  Organization → Department/Team-Leader selects, opened the members
  dialog and added/removed an employee (list updated live, count stayed
  in sync), attempted to delete the team while it still had a member and
  confirmed the 409 kept the confirm dialog open instead of silently
  closing, then removed the member and confirmed the delete succeeded.
  Network log showed only the expected pre-login `refresh` 401 and
  otherwise clean 200/201/204/409 responses; no browser console errors.
