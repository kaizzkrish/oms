# Module 23 — Deliverables

## Status: Complete

## What was built

`Deliverable` — a client/stakeholder-facing artifact produced during a
project, distinct from `Task` in that it tracks a submission-and-acceptance
workflow rather than internal work progress. Its optional links reach both
sideways into the WBS (`Milestone`) and out to `Employee`, giving it the same
two-way optional-relation shape as `Sprint` (team + scrum master) and `Task`
(module/feature/sprint + assignee), but pointed at a different pair.

### Data model

- `Deliverable` — belongs to exactly one `Organization` and `Project` (both
  required, `onDelete: Cascade`). `milestoneId` (`SetNull`) is optional and,
  when present, must belong to the *same project* — reusing the
  `assertXBelongsToProject` pattern `TasksService` established for its
  module/feature/sprint checks. `ownerId → Employee` (`SetNull`) reuses the
  "must share the organization" shape used everywhere from `Milestone.ownerId`
  onward.
- **Reinstates the uniqueness constraint** Task deliberately dropped:
  `@@unique([projectId, name])`. Deliverables are named, deliberately-produced
  artifacts (a report, a build, a design file) much closer in spirit to
  Milestones than to freely-repeatable task titles, so the scoped-uniqueness
  rule from every module before Task applies here again.
- **Its own `type`** — `DELIVERABLE_TYPES = ['DOCUMENT', 'SOFTWARE', 'DESIGN',
  'REPORT', 'OTHER']` — a second, independent instance of the `type` field
  Task introduced, describing *what kind of artifact* this is rather than
  *what kind of work item*.
- **A fifth distinct status set**: `PENDING / IN_PROGRESS / SUBMITTED /
  ACCEPTED / REJECTED`. Every prior status set modeled either open-ended work
  progress (Project/Module/Feature's `PLANNING…COMPLETED/CANCELLED`,
  Sprint's timeboxed variant, Task's kanban states) or a point-in-time event
  (Milestone's `ACHIEVED/MISSED`). Deliverable's set is neither — it models a
  client/stakeholder *acceptance workflow*: work happens (`PENDING` →
  `IN_PROGRESS`), gets handed over (`SUBMITTED`), and is then judged by
  someone outside the delivery team (`ACCEPTED`/`REJECTED`). `REJECTED` is a
  genuinely new outcome shape — nothing above it models "the work was
  finished but bounced back."
- **`dueDate`/`submittedDate`** — a planned-vs-actual pair in the same spirit
  as Milestone's `dueDate`/`achievedDate` and Task's `estimatedHours`/
  `actualHours`, but both are optional here (unlike Milestone, where
  `dueDate` is required) since a deliverable's due date may not be fixed
  until scope is finalized.

### Backend

- `DeliverablesService` injects `OrganizationsService`, `ProjectsService`,
  `MilestonesService`, and `EmployeesService` — the same four-dependency
  width as `MilestonesService` itself, with `MilestonesService` swapped in
  for `TeamsService`/`SprintsService` since Deliverable's second optional
  relation points at Milestone instead.
- `assertMilestoneBelongsToProject` and `assertOwnerBelongsToOrganization`
  mirror the equivalent checks in `TasksService` and `MilestonesService`
  respectively — no new validation shape, just a new combination of two
  already-established ones.
- 4 new permissions (`Deliverables.*`) under a new "Deliverable Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `DeliverableFormDialog` cascades `organizationId` → Project/Owner and
  `projectId` → Milestone, the same two-root, three-target shape
  `MilestoneFormDialog`/`SprintFormDialog` use, just with Milestone as the
  project-scoped target instead of a project-scoped Team. Type and Status
  render side-by-side in a row (mirroring Task's Type/Priority row), with a
  Due Date/Submitted Date pair beneath — both fields optional, so no
  end-after-start `.refine()` is needed the way Sprint's required date pair
  needed one.
- `DeliverablesListPage` adds Type and Deliverable Status filters alongside
  the standard search/organization/project/active filters, and its status
  chip coloring reflects the acceptance-workflow states: `SUBMITTED` =
  warning (awaiting a decision), `ACCEPTED` = success, `REJECTED` = error.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (15 new
  cases — create/update/delete/restore, organization/project existence and
  membership validation, milestone-belongs-to-project and owner-cross-org
  validation, uniqueness conflict on create/update, milestone-clear-to-null
  on update — 308 total), e2e tests (12 new cases — full lifecycle,
  duplicate names rejected within the same project, same name allowed across
  projects, cross-org project/milestone/owner rejection, a same-organization
  milestone+owner combination accepted together, organization/project
  filtering, 404s). Full e2e suite run showed the known pre-existing
  `afterAll`/`app.close()` teardown timeout on one suite
  (`permissions.e2e-spec.ts` this run); re-run alone passed 8/8, confirming
  it was unrelated to this module.
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, create through dialog, delete through confirm
  dialog — 87 total). Full-suite concurrent run hit the known "create
  through form dialog" timeout flake on three files at once (Clients,
  Deliverables, Features); re-running all three in isolation passed 12/12,
  confirming it was Vitest's concurrent-load flake rather than a regression.
  Production `vite build` succeeded with `DeliverablesListPage` code-split
  into its own chunk.
- Rebuilt the Docker backend and frontend images, recreated the containers,
  restarted nginx, ran the seed script (added the four `Deliverables.*`
  permissions and the sample "Beta Launch Readiness Report" deliverable —
  Website Redesign project / Beta Launch milestone / Jane Doe owner / REPORT
  / IN_PROGRESS). Verified end-to-end in a real browser via agent-browser:
  confirmed the Deliverables nav item and seeded row with project/milestone/
  owner/type/status all resolved, created a new "Browser Verification
  Deliverable" exercising the Organization → Project → Milestone cascade
  plus Owner/Type/Status/Due Date, edited it (status → Submitted, set
  Submitted Date), confirmed the change reflected in the list, deleted it,
  confirmed it moved to the Inactive filter, and restored it back to Active.
