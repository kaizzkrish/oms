# Module 25 — Documents

## Status: Complete

## What was built

`Document` — a project-scoped file repository, and the first module in the
build with a real binary payload: unlike `Reference` (an external URL) or
every prior entity (pure metadata), a `Document` owns an actual uploaded
file on disk. This is also the first module to add genuinely new
cross-cutting infrastructure rather than just reusing the established
schema/service/DTO scaffolding — a `StorageService`, a `multer`-based
upload pipeline, and a binary download endpoint that has to opt out of the
app's global JSON-envelope interceptor.

### Infrastructure added

- **`StorageService`** (`backend/src/common/storage/`) — a small local-disk
  storage abstraction, not tied to the Documents module specifically (any
  future module needing file storage imports `StorageModule`). Reads
  `STORAGE_DRIVER`/`STORAGE_ROOT` from config (already scaffolded in
  `.env`/`.env.example` since project setup, but unused until now).
  `save()` writes a buffer under `<root>/<subdirectory>/<uuid>-<sanitized
  original name>` and returns the path *relative* to the storage root
  (so the root can move between environments without invalidating stored
  paths); `getAbsolutePath()` resolves it back for reads. Deliberately
  throws `InternalServerErrorException` if `STORAGE_DRIVER` is ever set to
  `s3`/`minio` rather than pretending to support them — those remain
  unimplemented, consistent with "never generate fake implementations."
- **`SkipTransform` decorator** (`backend/src/common/decorators/`) +
  `TransformInterceptor` update — the global `TransformInterceptor` wraps
  every response in `{ success, statusCode, ..., data }`, which would
  corrupt a binary file download by nesting it inside JSON. `@SkipTransform()`
  is a `SetMetadata`-based route marker (the same shape `@RequirePermissions`
  already established) that the interceptor checks via `Reflector` before
  deciding whether to `map()` the response; only the download endpoint uses
  it so far, but it's now available to any future binary/streaming route.
- **`multer` + `@types/multer`** added as explicit backend dependencies
  (previously only a transitive dependency of `@nestjs/platform-express`,
  pinned to the exact version platform-express already bundles).

### Data model

- `Document` — belongs to exactly one `Organization` and `Project` (both
  required, `onDelete: Cascade`), the same minimal single-relation shape
  `Reference` established — no owner, no milestone/module/feature link.
  Adds five fields no prior entity needed: `fileName` (the original
  uploaded name, always preserved for downloads), `storagePath` (internal
  only — deliberately excluded from `DocumentEntity`, never serialized to
  the API), `mimeType`, `sizeBytes`, plus the now-familiar `type`/
  `description` pair.
- **A fourth independent `type` set**: `DOCUMENT_TYPES = ['CONTRACT',
  'INVOICE', 'REPORT', 'SPECIFICATION', 'OTHER']` — describing the kind of
  *paperwork* this is, a different classification axis from Deliverable's
  artifact-kind or Reference's link-kind.
- **No `status` field**, matching Reference — a document either exists or
  it's been soft-deleted; there's no in-between workflow state.
- Uniqueness at `@@unique([projectId, name])`, same as every non-Task
  module. Unlike every other module, `update` never touches the file
  itself — replacing a document's contents means deleting and re-uploading,
  since a metadata-only edit endpoint has no file to change; this keeps the
  storage layer's write path single-purpose (create-only) rather than
  needing an update-and-orphan-the-old-file dance.

### Backend

- `DocumentsService` injects `OrganizationsService`, `ProjectsService`, and
  `StorageService` — the same two-dependency width `ReferencesService`
  established, plus storage. `assertValidFile()` is new: checks the
  uploaded file's size against `MAX_DOCUMENT_SIZE_BYTES` (20MB) and its
  mime type against an explicit `ALLOWED_DOCUMENT_MIME_TYPES` allowlist
  (common office formats — PDF, Word, Excel, PowerPoint, plain text, CSV,
  PNG/JPEG, zip) *before* any organization/project lookups run, so a bad
  upload fails fast without wasted validation work.
- `DocumentsController.create` uses `@UseInterceptors(FileInterceptor('file',
  { storage: memoryStorage(), limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES }
  }))` — the file arrives as an in-memory buffer, kept out of the
  filesystem until `DocumentsService` explicitly hands it to
  `StorageService.save()`, so the service layer stays the single place
  that decides whether a file is actually persisted (mirroring the
  "service layer owns business logic" rule the rest of the backend
  follows).
- `DocumentsController.download` returns a NestJS `StreamableFile` wrapping
  a `createReadStream()` of the resolved absolute path, with
  `Content-Disposition: attachment` and the original file name — marked
  `@SkipTransform()` so the binary stream reaches the client untouched.
- 4 new permissions (`Documents.*`) under a new "Document Management"
  group; Admin gets all four, Team Leader gets `.View`.

### Frontend

- `documentsApi.ts` — `createDocument` builds a `FormData` body (RTK
  Query's `axiosBaseQuery` passes it straight to axios, which sets its own
  multipart boundary header automatically); this is the first mutation in
  the build that isn't plain JSON. `downloadDocument()` is deliberately
  **not** an RTK Query endpoint — the backend's binary response bypasses
  the JSON envelope `axiosBaseQuery` always expects, so it's a standalone
  function that fetches the file as a `Blob` (still authenticated via the
  same shared axios instance and its request interceptor) and triggers a
  client-side download through an object URL and a synthetic anchor click.
- `DocumentFormDialog` has a file picker only in create mode (an MUI
  `Button component="label"` wrapping a hidden `<input type="file">`) —
  edit mode shows an info alert explaining that replacing a file means
  deleting and re-uploading, matching the backend's create-only storage
  write path. Local `file`/`fileError` state resets on dialog-open via the
  React-recommended "adjust state during render when a prop changes"
  pattern (comparing `open` against a tracked `prevOpen` state) rather than
  inside a `useEffect`, satisfying the `react-hooks/set-state-in-effect`
  lint rule that every earlier form's plain `reset()`-in-effect pattern
  didn't trip (since `reset` is a react-hook-form method, not a raw
  `useState` setter the rule pattern-matches on).
- `DocumentsListPage` adds a Download action (byte-size formatted as
  B/KB/MB) alongside the usual Edit/Delete/Restore — the first list page
  with a fifth row action — and shows the original file name as secondary
  text under the display name.

## Verification performed

- Backend: `nest build`, `eslint --max-warnings=0`, unit tests (15 new
  `DocumentsService` cases — upload validation for size/mime type, name
  defaulting to the original file name, organization/project checks,
  uniqueness, update/delete/restore, download-info resolution; 3 new
  `StorageService` cases using a real temp directory — write-then-read
  round trip, file name sanitization against path traversal, non-local
  driver rejection; 2 new `TransformInterceptor` cases covering the
  `@SkipTransform` bypass — 339 total), e2e tests (11 new cases exercising
  real `multipart/form-data` requests via supertest's `.field()`/`.attach()`
  — upload without a file rejected, disallowed mime type rejected (415),
  full upload → list → fetch → **download** (byte-for-byte content,
  correct `Content-Type`/`Content-Disposition`) → update → delete → restore
  lifecycle, name defaulting, duplicate names rejected within a project,
  cross-org project rejection, filtering, 404s, same name allowed across
  projects). Full e2e suite run showed the known pre-existing `afterAll`/
  `app.close()` teardown timeout on one suite (`projects.e2e-spec.ts` this
  run); re-run alone passed 10/10, confirming it was unrelated to this
  module.
- Frontend: `tsc -b --force`, `eslint --max-warnings 0`, Vitest (4 new
  cases — list, empty state, upload through dialog with a real
  `userEvent.upload()` file attach, delete through confirm dialog — 99
  total). Full-suite concurrent run hit the known "create/upload through
  form dialog" timeout flake on two files (Features, Tasks); re-running
  both plus Documents in isolation passed 12/12, confirming it was
  Vitest's concurrent-load flake rather than a regression. Production
  `vite build` succeeded with `DocumentsListPage` code-split into its own
  chunk.
- Rebuilt the Docker backend and frontend images (backend image now
  includes `multer`), recreated the containers, restarted nginx, ran the
  seed script (added the four `Documents.*` permissions and a real sample
  document — "Website Redesign - Statement of Work", a genuine `.txt` file
  written to `backend/storage/documents/<org-id>/` through the same
  `DocumentsService.createDocument()` path the API uses, not a database-only
  fixture). Verified end-to-end in a real browser via agent-browser:
  confirmed the Documents nav item and seeded row with size/type resolved,
  uploaded a real file from disk (`agent-browser upload` against the
  underlying `input[type="file"]` — the wrapping MUI button isn't itself a
  file input, so the CSS selector was needed instead of an accessibility-tree
  ref), verified the Choose File button reflected the selected file name,
  submitted through the Organization → Project cascade with Report type,
  clicked Download with no console errors, edited the description,
  confirmed the change reflected in the list, deleted it, confirmed it
  moved to the Inactive filter, and restored it back to Active.
