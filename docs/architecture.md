# Architecture Overview

## System

Enterprise Office Management System (ERP) — a monorepo of a NestJS API and a
React SPA, backed by PostgreSQL and Redis, deployed via Docker Compose behind
Nginx on a local office server.

## Repository Layout

```
backend/     NestJS API (modular: controller/service/dto/entities/interfaces/repository)
frontend/    React 19 + Vite SPA (feature-first architecture)
docs/        Architecture notes and one document per completed module
docker/      Dockerfiles for backend and frontend
nginx/       Reverse proxy configuration
scripts/     Operational scripts (seeding, migrations, deployment helpers)
storage/     Local file storage (documents, images, avatars, exports, ...)
```

## Backend Module Shape

Every backend module under `backend/src/modules/<name>` contains:

- `controller` — HTTP layer, request/response mapping, Swagger decorators
- `service` — business logic, orchestrates repositories and other services
- `repository` — Prisma data access, isolates ORM concerns from business logic
- `dto` — request/response validation classes (class-validator + Zod where applicable)
- `entities` — response shape / domain types returned to clients
- `interfaces` — contracts for cross-module communication
- `*.spec.ts` — unit tests (Jest)

## Data Model Conventions

Every Prisma model includes standard audit columns:

- `id` (UUID, primary key)
- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy` (nullable FK to the acting user)
- `deletedAt`, `deletedBy` (soft delete)
- `isActive`

## Authentication & RBAC

- Database-driven JWT authentication (access + rotating refresh tokens),
  Argon2 password hashing, Redis-backed session/device tracking and token
  blacklist.
- Fully dynamic role-based access control: roles, permission groups, and
  permissions are managed at runtime by administrators — nothing is
  hardcoded in application code.

## File Storage

Files are written to `storage/<category>` on local disk through a storage
provider abstraction (`backend/src/common/storage`), so the backing
implementation can be swapped for MinIO or S3 later without touching
business logic.

## Reverse Proxy Routing (Nginx)

| Path      | Target             |
|-----------|--------------------|
| `/`       | React frontend      |
| `/api`    | NestJS backend      |
| `/docs`   | Swagger UI          |
| `/health` | Backend health check |

## Module Build Log

See `docs/modules/` for a per-module record of what was implemented and why.
