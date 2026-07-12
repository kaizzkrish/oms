# Module 10 — Permissions

## Status: Complete

## What was built

This module closes the RBAC loop MASTER_PROMPT set up across Modules 08–10:
dynamic Permission Groups and Permissions (admin-manageable, same pattern
as Roles), a `RolePermission` join table, and — the part that actually
makes any of it matter — real authorization enforcement retrofitted onto
the Users and Roles endpoints, which shipped with JWT-only auth and an
explicit note that permission checks would "layer on once Roles/
Permissions exist." They now do.

### Data model

- `PermissionGroup` — purely organizational (e.g. "User Management"),
  `onDelete: SetNull` on `Permission.groupId` so deleting a group ungroups
  its permissions rather than touching them.
- `Permission` — `name` (unique, validated against a `Resource.Action`
  regex, e.g. `Project.Create`), `isSystem`, `isActive`, optional
  `groupId`.
- `RolePermission` — the Role↔Permission join table, mirroring `UserRole`
  (own `assignedAt`/`assignedBy`).

### Backend

- **`PermissionsGuard` + `@RequirePermissions(...)`** — a global
  `APP_GUARD` (registered after `JwtAuthGuard`, same layering as
  `@Public()`) that no-ops when a route has no `@RequirePermissions()`
  metadata, and otherwise loads the current user's effective permission
  names (`PermissionsService.getEffectivePermissionNames`, joining
  `UserRole → Role → RolePermission → Permission`, filtered to active
  roles and active permissions only) and 403s if any required permission
  is missing.
- **`PermissionGroupsModule`/`PermissionsModule`** — CRUD mirroring the
  Roles module's shape exactly: soft-delete, `isActive`-filter fix
  reused from Module 08/09, system-record protection (rename/deactivate/
  delete all blocked) reused from Module 09 — except here the stakes are
  higher, since deleting a `Permission` a `@RequirePermissions()`
  decorator references by string would lock everyone (including Admin)
  out of that endpoint with no recovery path except recreating it by
  hand. `createSystemPermission()`/`createSystemRole()`-style methods
  are unreachable from the public API; only the seed script calls them.
- **`RolesController`** gained `/roles/:id/permissions` (list/assign/
  unassign), gated by a new `Roles.ManagePermissions` permission —
  modifying a role's permission set is treated as managing that role,
  the same way `/roles/:id/users` is.
- **Retrofit**: `UsersController`/`RolesController` endpoints now carry
  `@RequirePermissions('Users.View' | 'Users.Create' | ... )` etc. — 18
  permissions total across Users/Roles/Permissions/PermissionGroups.
- **Seed script** creates 3 permission groups, 18 system permissions, and
  grants all of them to the Admin role plus a view-only subset
  (`Users.View`, `Roles.View`) to Team Leader — Employee gets none yet,
  since no Employee-relevant module exists before this one.
- **`GET /permissions/me`** — no permission required (any authenticated
  user can see their own effective permissions); the frontend's only way
  to know what to show without guessing.

### Frontend

- **`usePermissions.ts`** — `useHasPermission(name)`, backed directly by
  RTK Query's `useGetMyPermissionsQuery()` rather than duplicating the
  data into `authSlice` — one cached query, deduped across every
  component that calls it.
- Sidebar nav items gained an optional `permission` field and are
  filtered live; `UsersListPage`/`RolesListPage`'s Create/Edit/Delete/
  Restore controls are now conditionally rendered on the matching
  permission (the underlying mutations were already enforced
  server-side — this just avoids showing a control that would 403).
- **`PermissionGroupsListPage`/`PermissionsListPage`** — same
  list/search/filter/CRUD shell as Roles, plus a Group `<select>` on the
  permission form and a resolved group-name column (permissions only
  store `groupId`, not a denormalized name).
- **`RolePermissionsDialog`** — the `RoleUsersDialog` pattern applied to
  permissions: an `Autocomplete` search-and-assign picker, filtering out
  already-assigned permissions, wired to the Roles list's new
  "Manage permissions" lock-icon action.

## Non-obvious bugs found only through real end-to-end verification

1. **`PermissionGroup`'s permission count included soft-deleted
   permissions**, since Prisma's relation `_count` counts every related
   row unless explicitly filtered — a group whose only permission had
   just been soft-deleted still reported `permissionCount: 1` and
   refused to delete. Same bug family as Modules 08/09's `isActive`/
   soft-delete interaction, but on a `_count` this time rather than a
   `where` clause. Fixed by adding `where: { deletedAt: null }` to the
   `_count.select.permissions` config. Caught by the e2e test itself,
   not by manual clicking — the "delete a group after deleting its only
   permission" assertion failed with 409 instead of 204.
2. **The frontend cached the previous account's permissions across a
   login/logout switch in the same tab.** `useGetMyPermissionsQuery()`
   uses a single shared cache key (`void` argument), so logging out of
   Admin and into a lower-privilege user reused Admin's cached
   `/permissions/me` response — the sidebar kept showing Permission
   Groups/Permissions links, and the Permissions page kept showing a
   "New Permission" button, for a user who actually has neither
   permission. The **backend correctly 403'd** every request regardless
   (verified via the network log — this was a display bug, not an
   authorization bypass), but a stale UI implying access the user
   doesn't have is still a real bug. Only caught by manually logging in
   as Admin, then immediately logging into a second, lower-privilege
   account in the same browser tab and watching the nav *not* shrink —
   an automated test wouldn't have hit this because none of the
   existing tests ever log in as two different accounts in the same
   session. Fixed by dispatching `apiSlice.util.resetApiState()` in
   both `login` and `logout`'s `onQueryStarted` (not `refresh` — a
   same-user silent refresh has no reason to blow away the whole
   cache).
3. **A shared test helper became necessary, not optional, this module.**
   Every list page now fires at least two queries on mount (its own list
   + `/permissions/me`), and the existing tests' positional
   `mockResolvedValueOnce` chains assume network calls resolve in the
   exact order they were queued — which breaks the instant a second
   concurrent query enters the picture, because Jest/Vitest's `...Once`
   queue is dequeued by call order, not by which request actually asked
   for it. `frontend/src/test/mockAxiosRouter.ts` (`routeAxios`) replaces
   that with method+URL-keyed responses, immune to ordering. Retrofitted
   onto `UsersListPage.test.tsx`/`RolesListPage.test.tsx` and used from
   the start for the two new pages' tests. Every future module's list
   page will hit this same multi-query pattern — reuse this helper
   rather than positional mocks.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (36 new
  cases across PermissionGroups/Permissions services + the guard, on top
  of Roles' service gaining permission-assignment coverage — 113 total),
  e2e tests (8 new cases: permission-group and permission full lifecycles
  including the group-permission-count fix, system-permission protection,
  a 403 assertion for a no-permission user, `/permissions/me`; plus a new
  role-permission-assignment case added to `roles.e2e-spec.ts` — 26
  total).
- Frontend: `tsc -b && vite build`, `eslint --max-warnings 0`, Vitest (31
  total across 9 files, including the two new list pages and the
  retrofitted Users/Roles tests).
- Rebuilt the Docker backend and frontend images and drove the actual
  browser at `http://localhost`: as the seeded Admin, created a custom
  permission with a group, assigned/unassigned it to the Team Leader
  role via the new Manage Permissions dialog, deleted and restored it
  under the Inactive filter, and confirmed the Users.View/Name/isActive
  fields lock on a system permission's edit dialog exactly like Roles'
  system-role protection. Then created a second, low-privilege user,
  assigned them the seeded Team Leader role, and — logging into that
  account immediately after Admin in the same tab — caught bug #2 above
  live (stale nav), fixed it, rebuilt, and re-verified: the second
  login now correctly shows only Home/Users/Roles/Profile in the
  sidebar (no Create/Edit/Delete controls on Users), while the network
  log showed a fresh `/permissions/me` call after each login and clean
  403s from the backend on every attempt to reach a route the account
  actually lacked, both before and after the fix.
