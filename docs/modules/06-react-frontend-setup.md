# Module 06 — React Frontend Setup

## Status: Complete

## What was built

- **Tooling**: replaced the Vite template's default `oxlint` with a real
  ESLint flat config (`eslint.config.js`) matching the fixed stack —
  `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-react-refresh`, Prettier. Added
  Vitest + React Testing Library (`@testing-library/react`, `jest-dom`,
  `user-event`) with a jsdom environment and coverage via
  `@vitest/coverage-v8`. Enabled `strict: true` in `tsconfig.app.json`
  (not set by the Vite template by default).
- **Feature-first folder structure**: `src/app` (store, providers, router),
  `src/features` (one folder per business module — currently just `home`),
  `src/shared` (`components`, `hooks`, `layout`, `api`), `src/theme`.
- **MUI theme**: `src/theme/theme.ts` — light/dark palettes via
  `createAppTheme(mode)`.
- **State management**: Redux Toolkit store (`src/app/store.ts`) with:
  - `uiSlice` — theme mode (persisted to `localStorage`, defaults to the
    OS `prefers-color-scheme`) and sidebar open/closed (defaults based on
    viewport width, matching the MUI `md` breakpoint where the drawer
    switches from permanent to a temporary overlay).
  - `notificationsSlice` — a toast-notification queue (`showToast`/
    `dismissToast`), rendered by a global `ToastContainer` (MUI
    `Snackbar`/`Alert`) mounted once in `AppLayout`, ready for every future
    module's create/update/delete feedback.
  - `apiSlice` — an empty RTK Query `createApi` base (zero endpoints),
    using a custom `axiosBaseQuery` wrapping a shared `axios` instance
    (per the fixed stack requiring both RTK Query *and* Axios). Feature
    modules will call `apiSlice.injectEndpoints(...)` — this is the
    standard RTK Query "central API, per-feature injection" pattern, not
    a stub.
- **Routing**: `react-router`'s `createBrowserRouter`, with the index
  route lazy-loaded via the router's native `lazy` API (confirmed to
  actually code-split — `HomePage` builds into its own chunk) and a
  `HydrateFallback` for the initial-load state.
- **Layout shell**: `AppLayout` composing `TopNav` (title, sidebar
  toggle, theme toggle), `Sidebar` (responsive MUI `Drawer` — permanent
  on desktop, temporary/overlay on mobile, MUI's built-in `selected` prop
  driving the active-route highlight instead of fighting
  `NavLink`/`className` typing), and `Breadcrumbs` (derived from
  `useMatches()` + a `handle.crumb` convention future routes will use).
- Data tables, filters, pagination, and dialogs were deliberately **not**
  built here — there's no data to display yet. They'll be built as shared
  components when the first list view needs them (Users, Step 8), not
  speculatively.

## Verification performed

- `tsc -b && vite build`, `eslint . --max-warnings 0`, and `vitest run`
  (9 tests: `uiSlice`, `notificationsSlice`, `HomePage`, `TopNav`) all
  pass.
- Ran the actual dev server and drove it with a real browser
  (agent-browser): confirmed the shell renders, the theme toggle switches
  the entire layout light/dark and persists, the sidebar toggle works,
  and — at a 390×844 mobile viewport — the sidebar correctly defaults
  closed and opens as a backdrop-scrimmed overlay when tapped.
- Rebuilt and ran the `frontend` Docker image via `docker compose up
  --build frontend` to confirm the new app shell is Docker-compatible.

## Bugs found and fixed during verification

- **Both nginx containers (`nginx`, `frontend`) reported `unhealthy` even
  though they served requests fine.** Their `HEALTHCHECK` used
  `wget http://localhost/`, and inside the container `localhost` resolves
  to `::1` (IPv6) first via `/etc/hosts`, while the `listen 80;` directive
  only bound IPv4 — so the healthcheck's own connection was refused.
  Fixed both `nginx.conf` and `nginx.frontend.conf` with an added
  `listen [::]:80;`, and both Dockerfiles' `HEALTHCHECK` to target
  `127.0.0.1` explicitly (belt and suspenders). Also added a missing
  `HEALTHCHECK` to the backend image (it had none) now that `/health`
  exists, and upgraded `docker-compose.yml`'s `depends_on` for
  frontend/nginx from plain container-started checks to
  `condition: service_healthy`, so the stack now actually waits on real
  health rather than just process start order.
- **`Typography fontWeight={n}` doesn't type-check without an explicit
  `component` prop** on this MUI version when used without one already
  present. Fixed by using `sx={{ fontWeight: n }}` instead (which was
  already how `TopNav` did it, just not consistently).
- **`configureStore`'s `preloadedState` widens narrow literal types**
  (e.g. `themeMode: 'light'` widened to `string`) unless the value is
  contextually typed against the slice's own type. Fixed by explicitly
  typing the literal (`const initialThemeMode: ThemeMode = 'light'`) in
  the test helper.
- **Node's experimental native `localStorage` global (unconfigured)
  shadows jsdom's implementation and throws `localStorage.getItem is not
  a function`** under Vitest. Fixed with an explicit in-memory `Storage`
  polyfill installed in `src/test/setup.ts`, plus a `matchMedia` stub
  (jsdom doesn't implement it, and `uiSlice` reads it at import time).
- **Sidebar defaulted to `open` on mobile too**, rendering as a
  backdrop-scrimmed overlay obscuring the whole page on first load —
  caught visually via a mobile-viewport screenshot, not by any automated
  test. Fixed by deriving the initial `sidebarOpen` from
  `matchMedia('(min-width: 900px)')` instead of hardcoding `true`.
- A stray `No HydrateFallback element provided` console warning from the
  lazy index route was fixed by adding a `FullPageLoader` component as
  the route's `HydrateFallback`.

## Note on this dev machine

While hunting down a port conflict (Vite fell back from 5173 to 5174),
found via `Get-CimInstance Win32_Process` that this machine has another,
unrelated project (`C:\Kaizz\kaizz\PMS`) with its own frontend/backend
dev servers often already running in the background. Stopped only the
`D:\oms\frontend` Vite process by matching its command line, and left the
other project's processes untouched.
