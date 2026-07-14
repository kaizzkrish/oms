# Module 19 — Features

## Status: Complete

## What was built

`Feature` — the second level of work breakdown inside a `Project`,
representing a discrete piece of functionality within a `ProjectModule`
(e.g. "Hero Banner Redesign" inside the "Homepage Revamp" module). This
is the first entity in the build order to sit three levels deep in the
work-breakdown chain: `Organization → Project → ProjectModule →
Feature`, and the remaining WBS modules (Milestones, Sprints, Tasks,
Deliverables) will extend or reference this same chain.

### Data model

- `Feature` — belongs to exactly one `Organization`, `Project`, and
  `ProjectModule` (all three `onDelete: Cascade`, all three required).
  This is the first entity with **three** required parent relations
  instead of one or two; `organizationId` and `projectId` are stored
  directly on the row (denormalized, same choice `ProjectModule` made
  for `organizationId`) purely so filtering by organization or project
  doesn't require joining through the module — the true ownership
  relation is `moduleId`.
- `ownerId → Employee` (optional, `SetNull`) reuses the "optional
  Employee reference must share the organization" shape a fifth time
  now, validated via `assertOwnerBelongsToOrganization`.
- Has **both** `status` and `priority`, matching `Project`'s richness
  rather than `ProjectModule`'s status-only shape — features are the
  granular, backlog-like unit where prioritization decisions actually
  get made (which feature ships next), so priority earns its place here
  in a way it didn't for the coarser module grouping. Both are plain
  strings validated via `@IsIn` against their own constants files,
  independent of Project's and ProjectModule's.
- **Uniqueness scoped one level deeper than any prior entity**:
  `@@unique([moduleId, name])`, not `[projectId, name]` or
  `[organizationId, name]`. Two different modules in the same project
  can each have a feature named "Validation" — this continues the
  precedent `ProjectModule` set (uniqueness scope tracks the immediate
  parent, not the tenant root) one level further down.
- Reuses the same `assertDateRangeValid` end-after-start rule.

### Backend

- `FeaturesService` injects `OrganizationsService`, `ProjectsService`,
  `ProjectModulesService`, and `EmployeesService` — validating the full
  chain on create: organization exists → project exists and belongs to
  it (`assertProjectBelongsToOrganization`, reused shape from
  `ProjectModulesService`) → module exists and belongs to that project
  (`assertModuleBelongsToProject`, the same "required-parent" assert
  shape one level down) → optional owner belongs to the organization.
  Update mirrors this: each of `projectId`/`moduleId`/`ownerId` is only
  re-validated when explicitly present in the request body, the same
  "don't re-check untouched fields" behavior established since Project.
- Search spans `name` and `code`.
- 4 new permissions (`Features.*`) under a new "Feature Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `FeatureFormDialog` chains three selects: Organization → Project
  (scoped by organization) → Module (scoped by the *selected project*,
  not the organization) — the first form where a cascading select's
  query key is a sibling field rather than always the top-level
  organization. Owner still cascades directly off Organization, same as
  Module Lead did for `ProjectModuleFormDialog`. Status and priority
  render side-by-side, mirroring `ProjectFormDialog`.
- `FeaturesListPage` extends the Organization→Project filter cascade
  from Modules one level further with a Project→Module filter, so the
  list can be scoped down to a single module's features; changing the
  Organization filter resets both Project and Module, and changing
  Project resets Module, keeping the three filters always consistent
  with each other.
- Status/priority chip coloring matches Project's scheme exactly, for
  visual consistency across all three related list pages now.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (18 new
  cases — create/update/delete/restore, organization/project/module
  existence and chain-membership validation, owner cross-org
  validation, duplicate-name-within-module rejection, reassigned-
  project and reassigned-module validation, end-date-before-start-date
  rejection — 246 total), e2e tests (12 new cases — full lifecycle,
  duplicate name blocked within a module, same name allowed across
  modules, cross-org project rejection, cross-project module rejection,
  cross-org owner rejection, invalid date range rejected,
  organization/project/module filtering, 404s — all 14 e2e suites and
  115 tests passed; one run hit the same pre-existing concurrent-load
  `afterAll` teardown flake seen in prior modules, this time in
  `organizations.e2e-spec.ts`, confirmed unrelated by the suite passing
  8/8 in isolation).
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through
  confirm dialog — 71 total), production `vite build`.
- Rebuilt the Docker backend and frontend images, recreated the
  containers, restarted nginx, confirmed the seed script's sample
  "Hero Banner Redesign" feature (Homepage Revamp module / Website
  Redesign project / Jane Doe owner / IN_PROGRESS / HIGH) via the live
  API. Verified end-to-end in a real browser via agent-browser:
  confirmed the Features nav item and seeded row with project/module/
  owner all resolved, used the Organization → Project → Module filter
  cascade to scope the list, created a new "Navigation Menu Redesign"
  feature exercising all three cascading selects plus owner/status/
  priority/dates, edited it (status → Completed) and confirmed the
  change reflected in the list, deleted it, confirmed it moved to the
  Inactive filter, and restored it back to Active. Network log showed
  only the expected 201/200/204/200 responses; no browser console
  errors.
