# Architecture Overview

## Architecture Principles

The application follows:

- Clean Architecture
- SOLID Principles
- DRY
- KISS
- Repository Pattern
- Dependency Injection
- Feature-first Frontend Architecture

Infrastructure concerns are isolated behind provider interfaces so business logic remains independent from deployment environment.

## Infrastructure Providers

External integrations must always be implemented through provider interfaces.
This is the target architecture — see **Current Implementation Status** below
for which of these actually exist in code today versus are still planned.

Planned providers:

Storage Provider

Email Provider

Cache Provider

Queue Provider

Logger Provider

Future providers can replace the default implementation without changing business logic.

Examples:

Storage

- Local Storage
- MinIO
- Amazon S3
- Azure Blob Storage

Email

- SMTP
- SendGrid
- Amazon SES

Cache

- Redis
- Memory Cache

Logger

- Winston
- Cloud Logging

## Current Implementation Status

This section is kept up to date as modules land, so it reflects what's
actually in the code rather than the target design above. Last checked
2026-07-13, after Module 14 (Employees).

- **Config** — real. `backend/src/config/configuration.ts` +
  `env.validation.ts` drive DB URL, Redis URL, JWT secrets, SMTP creds,
  storage driver/root, CORS origin, and rate limits entirely from env
  vars. No hardcoded values in source. Portable to any environment,
  including AWS, as-is.
- **Nginx** — real. `nginx/nginx.conf` is a generic path-based proxy
  (`/` → frontend, `/api` → backend, `/docs` → Swagger, `/health` →
  health check) with no hardcoded IPs or certs. Would sit cleanly behind
  an AWS ALB. Neither the on-prem nor the AWS path has TLS termination
  configured yet (no `ssl_certificate`/443 block) — that's a symmetric
  gap, not something specific to one deployment target.
- **Storage Provider — not implemented.** `backend/src/common/storage`
  does not exist yet; there is no `IStorageProvider` interface and no
  local/S3/MinIO implementation. `STORAGE_DRIVER` and `STORAGE_ROOT` are
  defined in config and validated, but nothing reads them — they're
  reserved, not wired up. No module currently does file I/O, because the
  modules that would need it (Documents, Attachments, Deliverables,
  Reports, Imports, Exports — MASTER_PROMPT steps in the 20s) haven't
  been built yet. Build the real abstraction before or alongside
  whichever of those modules lands first, not after — writing straight
  to local disk first and retrofitting the interface later would mean
  redoing that module's file-handling code, and would silently assume a
  writable local filesystem that doesn't exist on ECS/Fargate.
- **Email Provider — real, but not abstracted.**
  `backend/src/mail/mail.processor.ts` calls `nodemailer.createTransport`
  directly inside the BullMQ processor. There's no `IEmailProvider`
  interface, so "swap SMTP for SES" today means pointing `SMTP_HOST` at
  SES's SMTP endpoint (works, because any SMTP-speaking service does),
  not a real pluggable-provider architecture.
- **AWS/cloud deployment path — does not exist.** No Terraform/CDK/
  CloudFormation, no GitHub Actions workflows (no `.github/` directory
  at all), no `aws-sdk` dependency anywhere in the repo.
  `docker-compose.prod.yml` is a restart-policy/resource-limit override
  on top of `docker-compose.yml` — it still runs Postgres and Redis as
  containers rather than offering an RDS/ElastiCache alternative. Since
  `DATABASE_URL`/`REDIS_URL` are fully env-driven, pointing at managed
  AWS services is a compose-file edit away, not a code change — but that
  compose variant doesn't exist yet, so it isn't a verified, drop-in
  path today.

## API Versioning

All REST APIs must be versioned.

Examples

/api/v1

Future versions

/api/v2

/api/v3

Versioning must be implemented from the beginning.

## Configuration

The application must never hardcode:

Database URLs

Redis URLs

SMTP Credentials

JWT Secrets

Application URLs

Storage Paths

Everything must be configurable through environment variables.

Supported environments:

Development

Testing

Staging

Production

## Container Strategy

Every service runs independently.

Containers:

- frontend
- backend
- postgres
- redis
- nginx
- bullmq-worker
- bullmq-scheduler

All services communicate through Docker networks.

The same Docker images must run on:

- Local Development
- Office Server
- Cloud VM

Only environment variables may differ.

## Health Monitoring

Mandatory endpoints

GET /health

GET /ready

GET /live

GET /metrics (future)

These endpoints are used by:

- Docker
- Load Balancers
- Kubernetes (future)
- Monitoring Systems

## Logging

All logs must include:

- Timestamp
- Request ID
- User ID
- IP Address
- Module
- Action
- Log Level

Log categories:

- Authentication
- API Requests
- Database
- Audit
- Queue
- Background Jobs
- Errors

## Security

The application must implement:

- Helmet
- CORS
- Rate Limiting
- XSS Protection
- SQL Injection Protection
- Password Policy
- JWT Rotation
- Refresh Token Rotation
- Secure Cookies (where applicable)

## Performance

Always use:

- Database Indexes
- Pagination
- Lazy Loading
- Optimized Queries
- Connection Pooling
- Redis Caching

Avoid:

- N+1 Queries
- Full Table Scans
- Duplicate Queries

## Module Dependencies

Modules must communicate through interfaces.

Avoid direct module coupling.

Preferred:

Task Module

↓

Task Service Interface

↓

Notification Module

Not:

Task Module

↓

Notification Repository

## Event Driven Design

Business events should be published internally.

Examples:

UserCreated

TaskAssigned

TaskCompleted

RoleUpdated

NotificationCreated

Listeners must react to events instead of tightly coupling modules.

## Testing

Every module must include:

- Unit Tests
- Integration Tests
- API Tests

Critical modules:

Authentication

RBAC

Projects

Tasks

must maintain high test coverage.

## Deployment

The application must remain deployment agnostic.

Deployment must require changing only:

- Environment Variables
- Docker Compose files
- Reverse Proxy configuration

Business logic must never change because of deployment location.

## Cross Module Communication

Modules may communicate only through:

- Public Service Interfaces
- Domain Events
- Shared Common Services

Modules must never access another module's repository directly.

## System

Enterprise Office Management System (ERP)

A production-ready, enterprise-grade, deployment-agnostic Office Management System built as a monorepo using NestJS and React.

The target design is to run without code changes in:

- Local Development
- Office On-Premises Server
- Docker Compose
- Cloud Virtual Machine
- AWS
- Azure
- Google Cloud

Deployment-specific configuration must be handled exclusively through Docker and environment variables.

As of today (see **Current Implementation Status** above), that target is
met for configuration and the reverse proxy, but not yet for file storage,
email, or an actual cloud deployment path — no IaC or CI/CD exists for
AWS, Azure, or GCP yet, and the only environment this has actually been
run and verified in is local Docker Compose.

## Repository Layout

```
/
├── backend/
├── frontend/
├── docs/
├── docker/
├── nginx/
├── scripts/       (empty — reserved for future seeding/migration/deploy helpers)
├── storage/
├── .husky/
├── .vscode/
├── docker-compose.yml
├── docker-compose.prod.yml
├── pnpm-workspace.yaml
├── package.json
├── README.md
└── LICENSE
```

- `frontend/` — React 19 + Vite SPA (feature-first architecture)
- `docs/` — Architecture notes and one document per completed module
- `docker/` — Dockerfiles for backend and frontend
- `nginx/` — Reverse proxy configuration
- `scripts/` — Operational scripts (seeding, migrations, deployment helpers) — currently empty
- `storage/` — scaffolding only (see **File Storage** below); subfolders:
  `avatars/`, `attachments/`, `documents/`, `exports/`, `imports/`,
  `projects/`, `reports/`, `temp/`

## Backend Module Shape

backend/src/modules/<module>/

├── controller/
├── service/
├── repository/
├── dto/
├── entities/
├── interfaces/
├── validators/
├── decorators/
├── guards/
├── pipes/
├── interceptors/
├── modules/
    task/
        controllers/
        services/
        repositories/
        dto/
        entities/
        interfaces/
        validators/
        events/
            task-created.event.ts
        handlers/
            send-notification.handler.ts
├── constants/
├── utils/
├── types/
├── tests/
└── index.ts

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

**Target design:** files written to `storage/<category>` through a storage
provider abstraction (`backend/src/common/storage`), so the backing
implementation can be swapped for MinIO or S3 later without touching
business logic.

**Current status:** not implemented. No such abstraction exists yet, and no
module currently performs file I/O — the file-handling modules (Documents,
Attachments, Deliverables, Reports, Imports, Exports) haven't been built
yet. `STORAGE_DRIVER`/`STORAGE_ROOT` env vars and the `storage/` directory
scaffolding exist in anticipation of this, but nothing reads or writes
through them today. See **Current Implementation Status** near the top of
this document.

## Reverse Proxy Routing (Nginx)

| Path      | Target             |
|-----------|--------------------|
| `/`       | React frontend      |
| `/api`    | NestJS backend      |
| `/docs`   | Swagger UI          |
| `/health` | Backend health check |

## Module Build Log

See `docs/modules/` for a per-module record of what was implemented and why.
