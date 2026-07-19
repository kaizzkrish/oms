# Module 22 — Tasks

## Status: Complete

## What was built

`Task` — the atomic, granular work item at the bottom of the work-
breakdown chain, and the busiest entity in the build: it can optionally
reference a `ProjectModule`, a `Feature`, and a `Sprint` simultaneously,
in addition to its required `Project`, plus an optional `Employee`
assignee. Everything built in Modules 17–21 (Project → Module → Feature
→ Milestone/Sprint) exists so that Tasks have somewhere to attach.

### Data model

- `Task` — belongs to exactly one `Organization` and `Project` (both
  required, `onDelete: Cascade`). `moduleId`, `featureId`, and
  `sprintId` are all optional (`SetNull`) — a task can be filed against
  any combination of these, or none at all (a project-level task with
  no module/feature/sprint assignment is a completely valid state,
  unlike every entity above it in the chain where the immediate parent
  was non-negotiable). `assigneeId → Employee` reuses the now-familiar
  "must share the organization" optional-reference shape a sixth time.
- **First entity with `type` in addition to `status` and `priority`** —
  `TASK_TYPES = ['TASK', 'BUG', 'STORY', 'SUBTASK']`. Project, Module,
  and Feature all conflate "what kind of work is this" into their name
  and description; a Task tracker needs the distinction to be a real,
  filterable field (bugs vs. stories vs. plain tasks), so this is a
  deliberate new dimension, not present anywhere else in the schema.
- **Richest status set in the build**: `TODO / IN_PROGRESS / IN_REVIEW
  / DONE / BLOCKED / CANCELLED` — six states versus the five-or-fewer
  used everywhere above it. `IN_REVIEW` and `BLOCKED` only make sense at
  the level of an individual, actively-worked piece of work; a whole
  Project or Module doesn't sit "in review," but a single task waiting
  on code review does.
- **First entity with effort tracking**: `estimatedHours` and
  `actualHours` (`Decimal @db.Decimal(6, 2)` each, both optional,
  independent of each other) — a planned-vs-actual pair in the same
  spirit as Milestone's `dueDate`/`achievedDate`, but for effort instead
  of dates. `TaskEntity.fromPrisma` converts both via `Number(...)`, the
  same JSON-serialization handling `Project.budget` needed for its own
  `Decimal` field back in Module 17.
- `dueDate` is optional and singular (not a start/end range) — a task
  either has a deadline or it doesn't; there's no meaningful "task
  start date" the way there is for Sprint's fixed time-box.
- **First entity in the entire build with no uniqueness constraint on
  `name`.** Every previous named resource enforced uniqueness scoped to
  its parent (organization, project, module, or project again). Tasks
  are deliberately exempted: "Fix login bug" is a completely reasonable
  title to reuse many times across a project's lifetime, and real
  issue trackers (Jira, Linear, GitHub Issues) never enforce title
  uniqueness — they rely on an auto-numbered identifier instead, which
  here is the database `id` (and the free-text, non-unique `code`).
  This also simplifies the service layer: no `findByXAndName` lookup,
  no `ConflictException`, on either create or update.

### Backend

- `TasksService` injects `OrganizationsService`, `ProjectsService`,
  `ProjectModulesService`, `FeaturesService`, `SprintsService`, and
  `EmployeesService` — six dependencies, the most of any service in the
  build, mirroring Project's own four-dependency width but one level
  further down and with one more relation (Sprint) added to the mix.
  `assertModuleBelongsToProject`, `assertFeatureBelongsToProject`, and
  `assertSprintBelongsToProject` are the same "optional reference must
  share the *project*" shape `FeaturesService` established for its
  module check, now reused for two more relation types side by side.
- Search spans `name` and `code`, same as every other module — even
  without a uniqueness constraint, free-text search over both fields
  still works identically.
- 4 new permissions (`Tasks.*`) under a new "Task Management" group;
  Admin gets all four, Team Leader gets `.View`.

### Frontend

- `TaskFormDialog` is the widest cascade yet: `organizationId` feeds
  Project and Assignee directly, and the selected `projectId` feeds
  three more independent queries (Module, Feature, Sprint) — five
  cascading selects total from two root fields, more than any prior
  form. Type, Priority, and Status render as their own controls (Type
  and Priority paired in a row, Status full-width beneath), with a
  Due Date field and an Estimated/Actual Hours pair using the same
  string-refine-to-number Zod pattern Project's `budget` field
  established.
- `TasksListPage` adds a Type filter alongside Status and Priority —
  the first list page filtering on three independent enum dimensions
  at once — and its status chip coloring reflects the new states:
  `IN_REVIEW` = secondary, `BLOCKED` = error (visually equivalent to
  Cancelled, both signaling the task isn't moving), `DONE` = success.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (18 new
  cases — create/update/delete/restore, organization/project existence
  and membership validation, module/feature/sprint-belongs-to-project
  validation on both create and reassignment, assignee cross-org
  validation — 293 total; no uniqueness or date-range cases needed,
  consistent with Task's design), e2e tests (13 new cases — full
  lifecycle including setting both `estimatedHours` and `actualHours`,
  duplicate names allowed within the same project, cross-org project
  rejection, cross-project module/feature/sprint rejection, cross-org
  assignee rejection, a same-organization module/feature/sprint
  combination accepted together, organization/project/module/feature
  filtering, 404s — all 17 e2e suites and 150 tests passed cleanly with
  no teardown flake this run).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 83 total, no flake this run), production
  `vite build`.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, confirmed the seed script's sample
  "Build hero banner component" task (Website Redesign project /
  Homepage Revamp module / Hero Banner Redesign feature / Sprint 1 /
  Jane Doe assignee / IN_PROGRESS / HIGH / 12 estimated hours) via the
  live API. Verified end-to-end in a real browser via agent-browser:
  confirmed the Tasks nav item and seeded row with project/assignee/
  type/status/priority all resolved, used the Organization → Project
  filter cascade to scope the list, created a new "Fix navigation
  dropdown bug" task exercising all five cascading selects (Project,
  Module, Feature, Sprint, Assignee) plus type/priority/status/due
  date/estimated hours, edited it (status → Done) and confirmed the
  change reflected in the list, deleted it, confirmed it moved to the
  Inactive filter, and restored it back to Active. Network log showed
  only the expected 201/200/204/200 responses; no browser console
  errors.
