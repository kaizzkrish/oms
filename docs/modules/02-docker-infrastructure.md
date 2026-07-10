# Module 02 — Docker Infrastructure

## Status: Complete

## What was built

- `docker/backend/Dockerfile` — multi-stage build (pnpm workspace-aware:
  `deps` → `build` → `pnpm deploy --prod` → `runtime`). Runtime stage runs
  the compiled backend under PM2 (`pm2-runtime ecosystem.config.js`) as a
  non-root user.
- `docker/frontend/Dockerfile` — multi-stage build compiling the Vite app,
  served by a minimal `nginx:1.27-alpine` with SPA-fallback routing
  (`docker/frontend/nginx.frontend.conf`).
- `docker/nginx/Dockerfile` — bakes the reverse-proxy `nginx/nginx.conf`
  into a small custom image (see "Decisions" below for why this replaced a
  bind-mount).
- `nginx/nginx.conf` — reverse proxy routing `/` → frontend, `/api` and
  `/docs` → backend, with security headers and gzip.
- `docker-compose.yml` — postgres, redis, backend, frontend, nginx, with
  healthchecks and `depends_on: condition: service_healthy` gating.
- `docker-compose.prod.yml` — production overrides: `restart: always`,
  log rotation, resource limits, PM2 cluster mode via `PM2_INSTANCES=max`.
- `.dockerignore`.

## Decisions / non-obvious fixes

- **nginx config is baked into the image, not bind-mounted.** The original
  design bind-mounted `./nginx/nginx.conf` into the official `nginx:alpine`
  image. On this Windows/Docker Desktop host that bind-mount reproducibly
  failed (`mkdir /run/desktop/mnt/host/d: file exists`), a known Docker
  Desktop file-bind-mount quirk. Baking the config into a one-line custom
  image (`docker/nginx/Dockerfile`) sidesteps the host-specific bug and is
  also more reproducible for the Ubuntu production target (config travels
  with the image, not the host filesystem).
- **`pnpm deploy` has no `--legacy` flag on pnpm 9** (that flag exists on
  pnpm 10+, where the default deploy strategy changed). The Dockerfile
  pins `corepack prepare pnpm@9`, so the backend Dockerfile uses
  `pnpm --filter backend deploy --prod /prod/backend` without `--legacy`.

## Verification performed

- `docker build` succeeded for all three images (backend, frontend, nginx).
- Ran each container individually and via `docker compose up --build`;
  confirmed Postgres/Redis healthchecks pass, backend connects to Postgres
  via Prisma and serves through PM2, frontend serves the built SPA, and
  nginx correctly proxies `/` to the frontend and `/api` to the backend.
