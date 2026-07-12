# Module 08 — Users

## Status: Complete

## What was built

Module 07 (Authentication) created the `User` table and a foundation
`UsersRepository`/`UsersService` (findByEmail/findById/createUser/
updatePassword/recordLogin) with no admin-facing CRUD. This module adds
the admin CRUD surface on top of that same table — no new Prisma model or
migration was needed.

### Backend

- **`common/dto/pagination-query.dto.ts`** — shared base DTO
  (`page`/`limit`/`search`/`sortOrder`) so every future list endpoint
  (Roles, Organizations, ...) gets pagination/search/sort for free by
  extending it.
- **`common/interfaces/paginated-result.interface.ts`** —
  `PaginatedResult<T> = { items: T[]; meta: { page, limit, total,
  totalPages } }`, plus a `buildPaginationMeta` helper.
- **`common/decorators/api-paginated-response.decorator.ts`** —
  `@ApiPaginatedResponse(Model)`, a reusable Swagger decorator for the
  `{items, meta}` shape.
- **`common/transformers/to-boolean.transform.ts`** — `@ToBoolean()`, a
  reusable fix for a real NestJS/class-transformer bug found while
  building this module (see below). Any future boolean query filter
  should use this instead of a plain `@Transform`.
- **`modules/users/dto/`** — `CreateUserDto` (email/password/firstName/
  lastName/isActive, password validated against the same policy regex as
  Auth), `UpdateUserDto` (all fields optional, no password — password
  changes stay in the Auth module's change/reset-password flows),
  `QueryUsersDto` (extends `PaginationQueryDto` + `isActive` filter +
  `sortBy` restricted to `email|firstName|lastName|createdAt|lastLoginAt`).
- **`UsersRepository`** — `findMany`/`count` (search across email/first/
  last name, `mode: 'insensitive'`), `update`, `softDelete` (sets
  `isActive: false`, `deletedAt`, `deletedBy`), `restore` (clears both).
- **`UsersService`** — `listUsers`, `getUserOrThrow` (404), `updateUser`
  (409 on email collision with another user), `deleteUser` (blocks an
  admin from deleting their own account — 400), `restoreUser`.
- **`UsersController`** — `POST/GET /users`, `GET/PATCH/DELETE
  /users/:id`, `PATCH /users/:id/restore`. All protected by the existing
  global `JwtAuthGuard` (no `@Public()`); no permission-level
  authorization yet — that layers on once Roles/Permissions (Modules
  09–10) exist to define `User.Create`/`User.Delete`-style permissions.
  Deliberately not blocked on here per the strict module-by-module order.

### Frontend

- **`shared/components/ConfirmDialog.tsx`** — generic confirm dialog,
  reusable by every future module that needs a delete/deactivate
  confirmation.
- **`features/users/usersApi.ts`** — RTK Query endpoints (list/get/
  create/update/delete/restore) tagged `User`, with `{type:'User',
  id:'LIST'}` + per-id tags so create/update/delete/restore all
  auto-refresh the list with no manual refetching.
- **`features/users/UserFormDialog.tsx`** — one dialog for both create
  and edit. The Zod schema is built per-mode (`password` required only
  in create mode) rather than switching between two static schemas, so
  `useForm`'s generic type stays stable across modes.
- **`features/users/UsersListPage.tsx`** — MUI `Table` +
  `TablePagination` (no external data-grid dependency — the fixed stack
  doesn't call for one and plain MUI table components cover pagination/
  sorting/search/filtering in full), debounced search, an Active/
  Inactive/All status filter, sortable columns, row actions that switch
  between Edit/Deactivate and Edit/Restore based on `isActive`.
- Routing: `/users` added as a lazy-loaded protected route; `Users` added
  to the sidebar nav.

## Non-obvious bugs found only through real end-to-end verification

1. **A soft-deleted user became permanently unreachable in the UI.** The
   repository's `findMany` unconditionally excluded `deletedAt != null`
   rows, even when the Status filter was set to "Inactive" — so
   deactivating a user removed them from every view, with no way to find
   them again to click Restore. Only caught by actually deactivating a
   user in the browser and watching them vanish under every filter
   setting, including "All". Fixed by making the soft-delete exclusion
   conditional: filtering for `isActive: false` now also surfaces
   soft-deleted rows, since `restoreUser` already treats "restore" as a
   universal "make active again" regardless of *how* a user went
   inactive (soft-deleted vs. merely suspended via `PATCH
   {isActive:false}`).
2. **NestJS's `enableImplicitConversion` silently clobbers a custom
   `@Transform` for booleans.** `?isActive=false` was arriving at the
   repository as `true`. Root cause: the global `ValidationPipe`'s
   `enableImplicitConversion: true` runs its own naive `Boolean(value)`
   coercion on the raw query string *before* a property's `@Transform`
   callback sees `value` — so by the time our transform ran, `value` was
   already the boolean `true` (from `Boolean("false")`, a non-empty
   string), and a transform that bails out on non-string input silently
   let the wrong value through. Confirmed by isolating the DTO with
   `plainToInstance` directly (with and without
   `enableImplicitConversion`) outside of any HTTP request. Fixed by
   reading the pre-conversion raw value off `TransformFnParams.obj`
   instead of `value` — `obj` is always the original, untouched plain
   input object. Extracted as `@ToBoolean()` in `common/transformers/`
   so every future boolean query filter (Roles' `isSystem`, etc.) uses
   the safe version instead of rediscovering this.

Neither bug was caught by `tsc`, `eslint`, or the unit/e2e suites written
*before* the browser check — the pagination/filter unit tests all used
directly-constructed DTOs (bypassing class-transformer entirely) and the
first e2e pass only asserted the "no filter" and "delete removes it from
search" cases, not "Inactive filter after delete". Both are now covered:
the boolean bug by an e2e assertion that `?isActive=false` returns a
soft-deleted user, the visibility bug by the same assertion (they were
the same underlying fix, verified from two different angles).

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (14 cases
  covering create/list/update/delete/restore, including the self-delete
  guard and email-collision conflict), e2e tests (create → list → search
  → get → update → delete → confirm excluded from default list → confirm
  present under the Inactive filter → restore → confirm reappears
  under default list; plus self-delete-prevention and 404 cases).
- Frontend: `tsc -b && vite build`, `eslint --max-warnings 0`, Vitest
  (list rendering, empty state, create-through-dialog, deactivate-
  through-confirm-dialog — all against a mocked `axiosInstance`).
- Rebuilt the Docker backend and frontend images and drove the actual
  browser at `http://localhost` end-to-end: logged in as the seeded
  admin, opened Users, created a user through the dialog, edited it,
  deactivated it (confirmed it disappeared from the default list),
  switched the Status filter to Inactive (confirmed it reappeared with a
  Restore action — this is what surfaced bug #1 above), restored it, and
  confirmed the network log showed only 200/201/204 responses with no
  console errors throughout.
