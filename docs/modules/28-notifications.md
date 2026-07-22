# Module 28 — Notifications

## Status: Complete

## What was built

`Notification` — a per-user inbox entry (unread/read, dismissible,
restorable) with one real cross-module producer wired in: assigning an
employee to a task now creates a `TASK_ASSIGNED` notification for that
employee's user account. Admins can also send an ad-hoc `GENERAL`
notification to any user.

### Design

- **First entity scoped to `User` (the recipient), not `Organization` or
  `Project`.** Every prior module attached to the Organization/Project
  hierarchy in some form; a notification belongs to whichever user it was
  sent to, full stop — there is no organization- or project-scoped "list
  all notifications" view, only "list my own."
- **Ownership-based access control instead of permission-based gating**,
  for every self-service endpoint (list-own, unread-count, mark-read,
  mark-all-read, dismiss, restore). None of these carry a
  `@RequirePermissions` decorator — only the global `JwtAuthGuard`
  (authentication) applies. This mirrors the existing Profile page, which
  has no `permission:` field in `navItems.ts` for the same reason: viewing
  or managing your *own* data isn't an "admin manages other people's
  records" action, so gating it behind a `.View`-style permission would be
  category-wrong. Confirmed safe by reading
  `PermissionsGuard.canActivate` first — it returns `true` immediately
  when no permission metadata is present, so omitting the decorator is a
  deliberate choice, not an oversight, and authentication is still
  enforced globally regardless. The one exception: `POST /notifications`
  (send to an arbitrary target user) is gated behind the sole permission
  `Notifications.Create`, since sending to someone else *is* an
  admin/announcement action.
- **`getOwnNotificationOrThrow` throws `NotFoundException`, never
  `ForbiddenException`, when a notification belongs to a different user.**
  A caller acting on another user's notification id gets the same 404 as
  a nonexistent id — deliberately, so the response can't be used to probe
  whether a given id exists for someone else.
- **A real cross-module trigger wired into the already-completed Tasks
  module.** `TasksService` now injects `NotificationsService` and calls a
  private `notifyAssignee()` on `createTask` when `dto.assigneeId` is set,
  and on `updateTask` only when `dto.assigneeId` is provided *and* differs
  from the existing assignee (a genuine reassignment, not a resave of the
  same value). A notification system with no real producer wired in isn't
  an actual implementation, so Tasks — a module already marked complete —
  was deliberately reopened for this.
- No `sortBy` field on the query DTO (first module without one) — the
  list is always newest-first by `createdAt`, with only `sortOrder`
  exposed to flip it; there's no other meaningful sort axis for a
  notification feed.
- Full standard audit trail (`createdBy`/`updatedBy`/`deletedBy`,
  `isActive`/`deletedAt`) kept for consistency with every other entity,
  even though on the ownership-only self-service paths `updatedBy`/
  `deletedBy` end up equal to the notification's own `userId` — the
  acting user IS the owner in those cases.

### Backend

- `NotificationsService.notifyUser()` is the internal, permission-free
  entry point any module can call to notify a specific user directly
  (used by `TasksService.notifyAssignee`); `sendNotification()` is the
  admin-facing wrapper that additionally validates the target user exists
  and is reached only through the permission-gated controller route.
- `markAllRead` calls `notificationsRepository.markAllRead(userId,
  userId)` — the acting user's id is used as both the `where` filter and
  the `updatedBy` actor, since in a self-service bulk action those are
  always the same person.
- Route order in the controller is deliberate: literal-segment routes
  (`unread-count`, `read-all`) are declared before `:id`-parameterized
  routes, so Express/Nest's routing doesn't try to match `"unread-count"`
  against the `:id` param first.
- No sample-notification seed block. The pre-existing `SAMPLE_TASK` seed
  already sets `assigneeId`, so the very first time that task is created,
  `notifyAssignee` fires naturally and produces a real notification —
  no separate seed logic needed. (On a database where that task already
  existed before this module, the seed's idempotent skip means the
  trigger doesn't fire retroactively; a fresh task creation exercises it,
  which is how this module's live verification confirmed the trigger
  end-to-end.)
- Team Leader was not granted `Notifications.Create` — it's an
  admin/announcement capability, not a `.View`-style read grant, and the
  `TEAM_LEADER_PERMISSIONS` list is reserved for those.

### Frontend

- `NotificationBell` (in `shared/layout/`) polls
  `useGetUnreadCountQuery` every 30s and renders a badge in `TopNav`,
  visible only when a user is signed in (mirroring the sign-out button's
  existing conditional). Clicking it navigates to `/notifications`.
- The `Notifications` nav item has no `permission:` field, same
  reasoning as `Profile` — every authenticated user has notifications of
  their own to see, so nav visibility isn't permission-gated even though
  every other nav item in the app is.
- `NotificationsListPage` lists the current user's own notifications with
  read/status filters and a bulk "Mark all as read" action; row actions
  are context-sensitive (mark-read only while unread, dismiss while
  active, restore while inactive) with no confirmation dialog on
  dismiss/restore — unlike every other module's soft-delete, dismissing
  your own notification is a low-stakes, one-click-reversible action on
  data only you can see, not a shared record another user depends on.
- `SendNotificationDialog`, gated behind `Notifications.Create`, lets an
  admin pick a recipient (via the existing `useListUsersQuery`), a type,
  title, message, and optional link.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (13 new
  `NotificationsService` cases plus 4 new `TasksService` cases for the
  assignment trigger — notifies on create-with-assignee, no-op without an
  assignee, notifies on reassignment, no-op when the assignee is
  unchanged — 374 total), e2e tests (7 new cases: unauthenticated
  rejection, send-without-permission rejection, full
  send→list→unread-count→read→dismiss→list-inactive→restore lifecycle,
  404 on another user's notification for both read and delete, bulk
  mark-all-read, 404 for a non-existent target user, and a genuine
  integration test that creates an org/project/employee/task with an
  assignee through the real services and confirms — via the assignee's
  own login — that a `TASK_ASSIGNED` notification containing the task
  name is actually retrievable; 202 total across the e2e suite). Full
  e2e run at `--maxWorkers=4` passed all 202 tests; the one failure at
  default parallelism was the already-known single-suite
  `afterAll`/`app.close()` teardown flake (this run on
  `notifications.e2e-spec.ts`), confirmed unrelated by re-running that
  suite alone (7/7).
- Frontend: `tsc -b`, `eslint --max-warnings 0`, Vitest (13 new cases
  across `NotificationsListPage.test.tsx` and the updated
  `TopNav.test.tsx`, which now mocks `axiosInstance` and stubs
  `/notifications/unread-count` since the bell's polling query now fires
  on every render). Full-suite run hit the known form-dialog timeout
  flake on four unrelated files (Tasks, Sprints, Deliverables, Features);
  re-running all four in isolation passed 16/16.
- Rebuilt the Docker backend and frontend images and recreated the
  containers; restarted nginx per the known upstream-IP-caching issue.
  The `add_notifications` migration was already applied directly against
  the shared Postgres instance earlier in the session (confirmed via
  `_prisma_migrations`), so no separate migrate-deploy step was needed;
  re-ran the seed script, which added the `Notifications.Create`
  permission. No browser-automation tool was available in this session,
  so end-to-end verification was done via direct HTTP calls through
  nginx (the same path the frontend's `axiosInstance` uses) instead of a
  real browser: logged in as the seeded admin and employee, created a new
  task assigned to the employee and confirmed a real `TASK_ASSIGNED`
  notification appeared for them, then exercised unread-count,
  mark-read, dismiss, list-inactive, restore, an admin `sendNotification`
  call (confirmed delivered), a non-admin attempt correctly rejected with
  403, and mark-all-read resetting the unread count to 0. Also confirmed
  the deployed frontend bundle contains the new `NotificationsListPage`
  chunk.
