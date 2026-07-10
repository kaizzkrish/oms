# Module 01 — Project Initialization

## Status: In Progress

## What was built

- pnpm workspace (`backend`, `frontend`) with root tooling: Prettier,
  Husky, lint-staged, commitlint (Conventional Commits).
- Root `.env.example` covering app, database, Redis, JWT, SMTP, storage,
  and rate-limiting configuration.
- Repository documentation skeleton (`docs/architecture.md`, per-module logs).
- Local storage directory structure under `storage/`.
- Bare NestJS backend application (`backend/`).
- Bare Vite + React 19 + TypeScript frontend application (`frontend/`).

## Why

Establishes the monorepo tooling and conventions (package manager, linting,
formatting, commit hygiene) that every subsequent module builds on, per
`MASTER_PROMPT.md`'s AI Workflow and the user's finalized architecture
decisions.

## Follow-ups tracked for later steps

- ESLint configuration is added per-package in Step 5 (backend) and Step 6
  (frontend), since NestJS and React need different plugin sets; lint-staged
  will be extended to run `eslint --fix` once those configs exist.
- Docker, Postgres, and Redis wiring happens in Steps 2–4.
