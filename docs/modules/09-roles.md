# Module 09 — Roles

## Status: Complete

## What was built

Per MASTER_PROMPT's RBAC section ("Roles are dynamic. Administrator can
create: Roles, Permission Groups, Permissions... Nothing is hardcoded"),
this module adds fully admin-manageable roles, many-to-many assignable to
users, while still seeding three default roles (Employee, Admin, Team
Leader) an ERP needs from day one. "Not hardcoded" is interpreted as: no
code path special-cases a role by name (there is no `if role === 'Admin'`
anywhere) — the three defaults are ordinary rows created once by the seed
script, exactly like the seeded admin user, and are otherwise
indistinguishable from an admin-created role except for the `isSystem`
flag that protects them from deletion/renaming/deactivation.

### Data model

- `Role` — `name` (unique), `description`, `isSystem` (seed-only, blocks
  rename/deactivate/delete), `isActive`, full audit columns.
- `UserRole` — the join table making Role↔User many-to-many (a user can
  hold multiple roles — e.g. both "Team Leader" and "Employee"), with its
  own `assignedAt`/`assignedBy` for who granted a role and when.

### Backend

- **`common/transformers/to-boolean.transform.ts`** (from Module 08) is
  reused for the `isActive`/`isSystem` query filters — no new boolean
  parsing bugs to rediscover.
- **`RolesRepository`** — CRUD plus `findAssignment`/`assignUser`/
  `unassignUser`/`findUsersForRole`. `buildWhere` uses the same
  soft-delete/isActive interaction fix from Module 08: filtering for
  `isActive: false` also surfaces soft-deleted roles, since a role
  disabled via `PATCH {isActive:false}` and one removed via `DELETE`
  should both land in the same "find it and restore it" view.
- **`RolesService`** business rules layered on top of plain CRUD:
  - System roles (`isSystem`) can't be renamed, deactivated, or deleted —
    enforced in `updateRole`/`deleteRole`, not in the DTO layer, so the
    same `UpdateRoleDto` shape works for everyone and the *protection* is
    one auditable place to read.
  - A role with any assigned users can't be deleted (`ConflictException`
    naming the count) — forces unassigning first rather than silently
    orphaning `UserRole` rows or cascading a delete through to users.
  - Users can't be assigned to an inactive role (`BadRequestException`).
  - `createSystemRole()` is a separate method with no DTO, deliberately
    unreachable from the public API — only `prisma/seed.ts` calls it, so
    `isSystem: true` can never be set through `POST /roles`.
- **`RolesController`** — `POST/GET /roles`, `GET/PATCH/DELETE
  /roles/:id`, `PATCH /roles/:id/restore`, `GET /roles/:id/users`,
  `POST/DELETE /roles/:id/users/:userId` (assign/unassign). Depends on
  `UsersModule` (via `RolesModule` importing it) to verify a `userId`
  exists before assigning — reuses `UsersService.getUserOrThrow` rather
  than re-querying the `users` table directly.
- **Seed script** now also creates the three default roles idempotently
  (checked by name, same pattern as the admin user) and assigns the
  seeded admin user the Admin role — reusing `RolesService.findByName`/
  `hasUserRole`/`assignUser`, no duplicated business logic.
- **`eslint.config.mjs`** gained `src/generated/**` in `ignores` — see
  bug #1 below.

### Frontend

- **`shared/api/getErrorMessage.ts`** — extracts the backend's
  `AllExceptionsFilter` message (`{message: string | string[]}`) from an
  RTK Query error, falling back to a generic string. First real need for
  this was Roles' delete-blocked-by-assignment 409, where "Failed to
  delete role" is far less useful than "Cannot delete a role assigned to
  3 user(s). Unassign them first." Available for every future module
  with similar backend-validated conflicts.
- **`features/roles/rolesApi.ts`** — list/get/create/update/delete/
  restore plus `listRoleUsers`/`assignRoleUser`/`unassignRoleUser`. A
  separate `RoleUsers` tag (distinct from `Role`) is invalidated by
  assign/unassign so the "assigned users" panel refetches independently
  of the roles table, while assign/unassign also invalidate the specific
  `Role` detail tag so the table's live user-count stays in sync.
- **`RoleFormDialog.tsx`** — disables the Name field and Active switch
  (with an explanatory `Alert`) when editing a system role, mirroring
  the backend's protection in the UI so the rejection is never the first
  time a user learns a field is locked.
- **`RoleUsersDialog.tsx`** — an MUI `Autocomplete` searches
  `GET /users` live (debounced via RTK Query's own request de-duping),
  filters out already-assigned users client-side, and assigns/removes
  without leaving the dialog.
- **`RolesListPage.tsx`** — same table/pagination/search/status-filter
  shell as `UsersListPage`, plus a Type column (System/Custom `Chip`) and
  a Users column whose count is itself a button opening the assignment
  dialog. The delete action is hidden entirely for system roles (not
  just disabled) rather than showing a control that always 400s.
- Routing: `/roles` lazy route; `Roles` added to the sidebar nav.

## Non-obvious bugs found only through real end-to-end verification

1. **Regenerating the Prisma client (`prisma generate`) broke lint**,
   failing on 13 files under `src/generated/` with `prettier/prettier:
   Delete ⏎` — the generated client had never been excluded from
   ESLint (only from git, via `.gitignore`), so it had silently
   happened to match Prettier's formatting on every prior generation
   until this one. Fixed by adding `'src/generated/**'` to
   `eslint.config.mjs`'s `ignores` — permanent, not a one-off
   reformat, since the next `prisma generate` would have broken lint
   again otherwise.
2. **The same soft-delete/`isActive`-filter visibility bug from Module
   08 was deliberately re-guarded against here with an e2e assertion**
   (`?isActive=false` after a role delete) — confirms the repository
   pattern documented in memory was actually applied, not just copied
   into a doc.
3. **Docker: recreating only the backend+frontend containers (not
   nginx) left nginx serving 502s**, because nginx resolves upstream
   hostnames once at startup and had cached the *previous* frontend
   container's IP; the new container got a different IP on the same
   Docker network. `docker compose up -d backend frontend` alone is not
   enough after a rebuild — `docker restart` (or recreate) the `nginx`
   container too whenever an upstream service it proxies to gets
   recreated. Not fixed in `nginx.conf` itself (would need a
   `resolver` + variable-based `proxy_pass` for automatic
   re-resolution) since that's Module 02's file and this was a
   one-command workaround, not a code bug — noted here and in memory
   so the same 502 doesn't get mistaken for an application regression
   in a future module's verification pass.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (24 cases:
  create/update/delete/restore including all three system-role
  protections, assign/unassign including the inactive-role and
  already-assigned conflicts, pagination), e2e tests (6 cases: full
  create→list→get→update→assign→list-users→re-assign-conflict→
  delete-blocked→unassign→delete→inactive-filter→restore lifecycle;
  inactive-role assignment rejection; system-role rename/deactivate/
  delete rejection; 404).
- Frontend: `tsc -b && vite build`, `eslint --max-warnings 0`, Vitest (5
  cases: list rendering, empty state, create-through-dialog, delete-
  through-confirm-dialog, system roles hide the delete action).
- Rebuilt the Docker backend and frontend images and drove the actual
  browser at `http://localhost`: confirmed the three seeded system roles
  render with no delete action and a live user count; created a custom
  role; assigned the seeded admin user to it via the Autocomplete picker
  (user count updated live to 1); confirmed deletion was blocked with the
  specific "Cannot delete a role assigned to 1 user(s)" message (via the
  new `getErrorMessage` helper, not a generic fallback); unassigned, then
  deleted successfully; confirmed the deleted role reappeared under the
  Inactive filter with a Restore action, and restored it; opened the
  Admin system role's edit dialog and confirmed the Name field and Active
  switch were disabled with an explanatory alert. Network log showed only
  the expected pre-nginx-restart 502s and the normal unauthenticated
  silent-refresh 401 — no unexpected failures.
