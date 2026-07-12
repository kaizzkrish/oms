# Module 07 — Authentication

## Status: Complete

## What was built

### Data model

- `User` (business entity, full audit columns per the architecture
  convention: `createdBy`/`updatedBy`/`deletedBy` self-relations,
  `isActive`, soft-delete via `deletedAt`), plus `lastLoginAt`.
- `Session` — one row per device/login, storing a **hash** of the current
  refresh token (never the raw token), `userAgent`, `ipAddress`,
  `expiresAt`, `revokedAt`. This is the durable "Session Management"
  record the Profile page lists and lets a user revoke.
- `PasswordResetToken` — a hashed, single-use, time-limited token for the
  forgot/reset-password flow.

Session/PasswordResetToken deliberately don't carry the full
`createdBy/updatedBy/deletedBy/isActive` audit block — they're
system-generated records with their own lifecycle (`revokedAt`/`usedAt`),
not admin-managed business entities.

### Backend

- **`common/password/`** — `PasswordService`, global provider. Hashes
  with Argon2 by default (bcrypt if `PASSWORD_HASH_ALGORITHM=bcrypt`);
  `verify()` detects the algorithm from the hash's own prefix, so
  changing the config later doesn't break existing hashes.
- **`mail/`** — `MailService`/`MailProcessor`, a BullMQ `mail` queue
  consumed by a Nodemailer-backed worker. `AuthService` enqueues a
  password-reset email rather than sending it inline on the request path.
- **`modules/users/`** — foundation only (`UsersRepository`,
  `UsersService`: findByEmail/findById/createUser/updatePassword/
  recordLogin). No controller/admin CRUD/DTOs yet — those, plus richer
  profile fields if needed, arrive in Module 08 (Users), built on this
  same `User` table.
- **`modules/auth/`**:
  - `TokenService` — signs/verifies access (short-lived, carries a `jti`
    for revocation) and refresh (carries `sid` + its own `jti`) JWTs with
    separate secrets; maintains the Redis-backed access-token blacklist.
  - `JwtStrategy`/`JwtAuthGuard` (passport-jwt) — registered as a
    **global** `APP_GUARD`, so every new endpoint is auth-required by
    default; `@Public()` opts a route out (login, refresh, forgot/reset
    password, and `/health`).
  - `AuthService` — login, refresh (with **rotation**: a new refresh
    token invalidates the old one; presenting an already-rotated token
    revokes the whole session, treating reuse as a theft signal), logout
    (revokes the session + blacklists the current access token until its
    natural expiry), change-password (revokes all *other* sessions),
    forgot/reset-password (enumeration-safe — always the same response
    regardless of whether the email exists), session listing/revocation.
  - `AuthController` — `POST /auth/{login,refresh,logout,change-password,
    forgot-password,reset-password}`, `GET /auth/{profile,sessions}`,
    `DELETE /auth/sessions/:id`. Login has a tighter rate limit (5/min)
    than the global default.
  - **Refresh token delivery**: an httpOnly, `SameSite=Strict`,
    `path=/api/auth` cookie — never sent to the client in the JSON body,
    and never touched by frontend JS. The access token is returned in the
    body and kept in memory only (Redux), not localStorage, to limit XSS
    blast radius. `SameSite=Strict` is the CSRF mitigation for this
    design; it's sufficient here because the frontend and API are always
    same-origin behind nginx (see Module 02) — there's no cross-site
    context for this cookie to leak into.
- Seed script (`backend/prisma/seed.ts`, run via `pnpm --filter backend
  db:seed` / `prisma db seed`) creates one admin user from
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (defaults: `admin@oms.local` /
  `ChangeMe123!` — change immediately in any real deployment). It reuses
  `UsersService.createUser` via `NestFactory.createApplicationContext`
  rather than duplicating hashing logic.

### Frontend

- `authSlice` — `accessToken` (memory only) + `user` + `status`
  (`checking`/`authenticated`/`unauthenticated`).
- `authApi` (RTK Query, injected into the shared `apiSlice`) — login,
  refresh, logout, getProfile, changePassword, forgotPassword,
  resetPassword, getSessions (tagged `Session`), revokeSession
  (invalidates `Session` — the sessions list auto-refetches after a
  revoke with no manual wiring). `login`/`refresh`/`logout` each dispatch
  `setCredentials`/`clearCredentials` via `onQueryStarted`, so any caller
  of these endpoints gets consistent state updates for free.
- `setupAxiosInterceptors` — attaches `Authorization: Bearer` from the
  store to every request; on a 401 (excluding the refresh call itself),
  transparently refreshes once and retries, queuing any other requests
  that 401'd while a refresh was already in flight.
- `rootLoader` — runs once when the router hydrates, attempting a silent
  refresh via the httpOnly cookie so a full page reload doesn't force a
  re-login.
- `ProtectedRoute` — renders `FullPageLoader` while `status === 'checking'`,
  redirects to `/login` (preserving the attempted path via router state)
  when unauthenticated, otherwise renders `AppLayout`.
- Pages: `LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage` (all
  public), `ProfilePage` (protected — profile info, change-password form,
  active-sessions list with per-device revoke). `TopNav` gained a
  sign-out button, shown only when a user is signed in.

## Non-obvious fixes found only through real end-to-end verification

Backend unit/e2e tests and `tsc`/`eslint` all passed before any of these
were caught — none of them are the kind of bug a type checker or a
narrowly-scoped test catches:

1. **`/health` started requiring a JWT** the moment the global
   `JwtAuthGuard` was wired in, because it was never marked `@Public()`.
   Caught by the pre-existing e2e health test.
2. **Refresh-token rotation didn't actually prevent reuse.** The refresh
   JWT payload was only `{sub, sid}`; two tokens issued for the same
   session within the same wall-clock second (identical `iat`/`exp`) were
   byte-for-byte identical, so "has this token already been rotated out"
   was comparing a string to itself. Fixed by adding a random `jti` to
   the refresh payload. Caught by a fast automated e2e test doing
   login→refresh→refresh-with-old-token in quick succession — exactly
   the timing this bug depended on.
3. **The frontend was hard-coded to call the production LAN IP**
   (`http://192.168.1.100/api`, baked in via `VITE_API_BASE_URL` at
   Docker build time) instead of a relative `/api`. Since nginx always
   serves the frontend and proxies `/api` on the *same* origin, there is
   no legitimate reason for this to be an absolute, cross-origin URL —
   only caught by actually driving the login form in a browser and
   inspecting the network tab; the request never even reached the
   backend, so no backend log or test caught it.
4. **The backend wraps every response in `{success, data}` (Module 05's
   `TransformInterceptor`), but the frontend's `axiosBaseQuery` was
   returning the raw envelope as RTK Query's `data`**, so every consumer
   was one level too shallow (`result.data.accessToken` was actually
   `undefined`; the real value was at `result.data.data.accessToken`).
   Fixed once, centrally, in `axiosBaseQuery` so every current and future
   endpoint unwraps correctly.
5. **Nothing dispatched `setCredentials` after a successful login.** The
   `login` mutation only returned data to whoever called `.unwrap()`; no
   code path ever wrote it into `authSlice`. Combined with bug #4 (which
   made the login response look "successful but empty"), this silently
   left the user on the login page after a genuinely successful login
   with no error shown. Fixed by adding `onQueryStarted` to `login`/
   `refresh`/`logout`.

## Verification performed

- Backend: `nest build`, `eslint`, unit tests (PasswordService, MailService,
  UsersService, TokenService, AuthService — login/refresh/rotation/reuse-
  detection/logout/change-password/forgot-password/reset-password/session
  management, ~20 cases), and an e2e suite driving the *real* flow against
  the dockerized Postgres/Redis (login → profile → refresh → rotation
  reuse-rejection → change-password → re-login → logout → blacklisted-
  token-rejected), plus enumeration-safety and invalid-token cases.
- Frontend: `vite build` (confirmed each route still code-splits),
  `eslint`, Vitest (authSlice, plus updated TopNav tests for the new
  auth-aware sign-out button).
- Rebuilt the full Docker stack and drove the **actual browser** through
  the whole flow end-to-end at `http://localhost` (via nginx, matching
  the real deployment topology): login with the seeded admin, redirect-
  to-originally-requested-page after login, Profile page (info, sessions
  list with live per-device revoke, wrong-current-password rejection),
  sign-out redirecting to `/login`, direct navigation to a protected
  route while signed out redirecting to `/login`, and — the real point of
  the httpOnly-cookie design — **staying signed in across a full page
  reload** via the silent-refresh root loader. Also confirmed Swagger at
  `/docs` documents every Authentication endpoint with the bearer-auth
  lock icon on protected routes.
