# Module 24 — References

## Status: Complete

## What was built

`Reference` — the simplest entity in the entire build: a named external link
(design file, repository, documentation page, or anything else) attached to
a project. Closes out the "project-scoped work-breakdown" arc that started
with Module 17 (Project) by adding a deliberately minimal, single-relation
leaf model, in contrast to every other entity in Modules 18–23 which grew
progressively more relation-heavy.

### Data model

- `Reference` — belongs to exactly one `Organization` and `Project` (both
  required, `onDelete: Cascade`). **No optional relations at all** — no
  owner, no milestone, no module/feature/sprint link. Every entity since
  Module 18 (`ProjectModule`) added at least one optional cross-reference on
  top of its required parent; Reference deliberately has none, because a
  reference link doesn't belong to a person or a phase of work — it belongs
  to the project as a whole.
- `url` is a **required** field validated with `@IsUrl()` — the first
  required-and-validated-format string field in the build (every other
  module's string fields are free text with only length constraints).
- **Its own `type`** — `REFERENCE_TYPES = ['LINK', 'REPOSITORY', 'DESIGN',
  'DOCUMENTATION', 'OTHER']` — a third independent instance of the `type`
  field pattern, alongside Task's and Deliverable's own sets.
- **No `status` field at all** — the first entity since Milestone to omit
  one. A reference link doesn't progress through states the way a
  task/sprint/deliverable does; it either exists (`isActive`) or it's been
  removed. `isActive`/soft-delete is the only lifecycle concept it needs.
- Uniqueness reinstated at `@@unique([projectId, name])`, same scoped
  pattern as every module except Task.

### Backend

- `ReferencesService` injects only `OrganizationsService` and
  `ProjectsService` — two dependencies, the narrowest of any service in the
  build (every module since Milestone needed at least one more for its
  optional-owner/relation checks). `assertProjectBelongsToOrganization` is
  the same check every module has used since Module 18; there is no second
  assertion method because there is no second optional relation to validate.
- 4 new permissions (`References.*`) under a new "Reference Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `ReferenceFormDialog` cascades a single root field (`organizationId`) into
  a single target (`projectId`) — the simplest cascade in the build, versus
  Task's five-way cascade from two roots. URL uses Zod's `.url()` validator
  for client-side format checking ahead of the backend's `@IsUrl()`.
- `ReferencesListPage` renders the URL as a clickable `Link` (opens in a new
  tab) rather than plain text — the first list page to render a field as
  an outbound hyperlink. No status chip column, since there's no status
  field to show; Type renders as a plain `Chip` instead (no color-per-value
  mapping needed, since there's no status semantics to distinguish).

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (12 new
  cases — create/update/delete/restore, organization/project existence and
  membership validation, uniqueness conflict on create/update — 320 total),
  e2e tests (10 new cases — full lifecycle, invalid URL format rejected,
  duplicate names rejected within the same project, same name allowed across
  projects, cross-org project rejection, organization/project filtering,
  404s). Full e2e suite run showed the known pre-existing `afterAll`/
  `app.close()` teardown timeout on one suite (`roles.e2e-spec.ts` this
  run); re-run alone passed 7/7, confirming it was unrelated to this module.
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through confirm
  dialog — 91 total, full suite passed cleanly with no flake this run).
  Production `vite build` succeeded with `ReferencesListPage` code-split
  into its own chunk.
- Rebuilt the Docker backend and frontend images, recreated the containers,
  restarted nginx, ran the seed script (added the four `References.*`
  permissions and the sample "Design System Figma" reference — Website
  Redesign project / DESIGN type). Verified end-to-end in a real browser via
  agent-browser: confirmed the References nav item and seeded row with
  project/type resolved and the URL rendered as a clickable link, created a
  new "Browser Verification Reference" through the Organization → Project
  cascade with a Repository type, edited it (updated the URL), confirmed the
  change reflected in the list, deleted it, confirmed it moved to the
  Inactive filter, and restored it back to Active. Along the way, confirmed
  that the list page's project-name lookup showing "—" for some rows is a
  pre-existing, shared cosmetic limitation across every module's list page
  (the lookup only fetches the first 100 projects by name, and this dev
  database has accumulated 110+ from repeated e2e test runs) — not a defect
  introduced by this module, and confirmed unaffected when an Organization
  filter scopes the project query down.

## Milestones/Sprints/Tasks/Deliverables/References arc — retrospective

With References complete, the work-breakdown-structure portion of the build
(Modules 17–24: Project → Module/Feature → Milestone/Sprint/Task/Deliverable/
Reference) is done. Each module deliberately varied one or two dimensions
from its predecessors (parent attachment point, status vocabulary, presence
or absence of `type`, uniqueness rules, relation width) while reusing the
same audit/soft-delete/pagination/permission scaffolding throughout — by
design, so that the marginal cost of each new module stayed low while the
domain modeling stayed honest to how project work actually decomposes.
