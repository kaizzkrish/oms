# Office Management System

Production-grade Enterprise Office Management System (ERP) — built module by
module per [MASTER_PROMPT.md](MASTER_PROMPT.md).

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Material UI, Redux Toolkit, RTK Query, React Router, React Hook Form, Zod, Axios

**Backend:** Node.js 22 LTS, NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis, JWT, Swagger, Winston, BullMQ

**Infrastructure:** Docker, Docker Compose, Nginx, PM2

## Repository Layout

```
backend/     NestJS API
frontend/    React 19 + Vite SPA
docs/        Architecture notes and per-module documentation
docker/      Dockerfiles
nginx/       Reverse proxy configuration
scripts/     Operational scripts (seeding, migrations, deployment)
storage/     Local file storage
```

See [docs/architecture.md](docs/architecture.md) for details.

## Prerequisites

- Node.js 22 LTS
- pnpm >= 9
- Docker + Docker Compose (for full-stack local run)

## Getting Started

```bash
cp .env.example .env
pnpm install
```

### Run with Docker (recommended)

```bash
docker compose up --build
```

- Frontend: `http://<SERVER_HOST>`
- API: `http://<SERVER_HOST>/api`
- Swagger: `http://<SERVER_HOST>/docs`
- Health check: `http://<SERVER_HOST>/health`

### Run locally without Docker

```bash
pnpm dev:backend
pnpm dev:frontend
```

## Development Workflow

This project is built strictly module by module, following the build order
and quality checklist defined in `MASTER_PROMPT.md`. Each module is committed
separately using Conventional Commits (e.g. `feat(auth): complete
authentication module`) once it builds, lints, and passes tests.

## Module Status

| # | Module | Status |
|---|--------|--------|
| 1 | Project Initialization | Complete |
| 2 | Docker Infrastructure | Complete |
| 3 | PostgreSQL | Complete |
| 4 | Redis | Pending |
| 5 | NestJS Backend Setup | Pending |
| 6 | React Frontend Setup | Pending |
| 7 | Authentication | Pending |
| 8 | Users | Pending |
| 9 | Roles | Pending |
| 10 | Permissions | Pending |
| 11 | Organizations | Pending |
| 12 | Departments | Pending |
| 13 | Designations | Pending |
| 14 | Employees | Pending |
| 15 | Teams | Pending |
| 16 | Clients | Pending |
| 17 | Projects | Pending |
| 18 | Modules | Pending |
| 19 | Features | Pending |
| 20 | Milestones | Pending |
| 21 | Sprints | Pending |
| 22 | Tasks | Pending |
| 23 | Deliverables | Pending |
| 24 | References | Pending |
| 25 | Documents | Pending |
| 26 | Dashboard | Pending |
| 27 | Reports | Pending |
| 28 | Notifications | Pending |
| 29 | Audit Logs | Pending |
| 30 | Settings / System Configuration | Pending |

## License

Proprietary — see [LICENSE](LICENSE).
