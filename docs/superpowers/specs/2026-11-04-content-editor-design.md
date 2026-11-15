# Admin content editor with draft/publish — design

Date: 2026-11-04. Replaces the manual "Adding a new subject" checklist (§9 of the foundation
spec) with an in-app editor for ADMINs. Questions remain `TODO(quiz)`.

## Goals

- ADMINs create and edit subjects, sections, lessons, and lesson content blocks at `/admin`.
- Learners never see half-finished work: new structure and content edits stay in draft until the
  admin publishes, and several subjects can be published in one action.
- No new dependencies. Block editing is one form card per block with a live preview through the
  existing `LessonContent` renderers.

## Draft/publish model

One set of tables plus "published" markers; no duplicated rows.

| Model   | Fields                                    | Meaning                                                              |
| ------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Subject | `isActive` (default false), `publishedAt` | Visible to learners when active. First publish sets both.            |
| Section | `publishedAt`                             | Null = exists only in the editor.                                    |
| Lesson  | `publishedAt`, `draftContent`             | `content` is what learners read; `draftContent` is the pending edit. |

- New sections and lessons start with `publishedAt = null`; learner queries filter them out
  (`listActiveSubjectsForUser`, `getSubjectBySlugForUser`, `getLessonForUser`, `getSubjectTree`).
- The block editor writes `draftContent` only (`saveLessonDraft()`); `content` is written only by
  `saveLessonContent()`, which publishing calls.
- `publishSubjects(ids)` per subject, in one transaction each: copy each draft into `content`
  (syncing `LessonAsset`), clear the draft, stamp `publishedAt` on unpublished sections/lessons, set
  `isActive = true`. A subject whose draft is invalid or references a missing asset is rolled back
  and reported in `failed`; the others still publish. Afterwards `sweepOrphanAssets()` deletes
  uploads older than an hour that no lesson (live or draft) or material references.
- `saveLessonDraft()` syncs `LessonAsset` to the union of live and draft asset ids, so draft uploads
  are referenced and survive the sweep. A draft that fails the schema is reported as `draftInvalid`
  and the editor falls back to the live content.
- "Pending changes" = inactive subject, or any section/lesson without `publishedAt`, or any lesson
  with a draft. `listSubjectsForAdmin()` computes it; `/admin/publish` lists exactly those subjects.
- **Deliberate limit:** titles, order, theme, and deletes apply immediately. Staging every field would
  double the schema for little benefit. Revisit if admins edit live subjects heavily.
- The seed marks everything it creates as published; the `content_publishing` migration backfills
  `publishedAt` for rows that existed before.

## Server modules

- `app/server/content/admin.server.ts` — only writer of Subject/Section/Lesson structure and of
  `draftContent`: list/create/update/delete subject, create/rename/delete/move section and lesson
  (move swaps with the neighbour, reorder drops a row at another row's position; both rewrite
  `sortOrder` 1..n), `getLessonForAdmin`, `saveLessonDraft`. Subjects are listed alphabetically
  by name; `Subject` has no `sortOrder`.
- `app/server/content/publish.server.ts` — `publishSubjects(ids): count`.
- `app/server/storage/upload.server.ts` — `storeUploadedImage(file, userId)`: sniffs PNG/JPEG/GIF/WebP
  magic bytes (client MIME is ignored), enforces `UPLOAD_MAX_BYTES` (default 5 MiB), then
  `createAssetFromBuffer`.
- `app/schemas/admin-content.ts` — zod for every editor form (`SubjectInputSchema`,
  `SubjectPageIntentSchema` discriminated on `intent`, `BlocksFormSchema`, `PublishFormSchema`).

## Routes (`/admin`, layout enforces ADMIN; every action calls `requireRole` again)

| Route                        | Purpose                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                     | Subject table with status pills and a pending counter; links to new/publish.                                                          |
| `/admin/subjects/new`        | Metadata form; creates a hidden subject and redirects to its edit page.                                                               |
| `/admin/subjects/:subjectId` | Metadata form + structure tree (sections/lessons: rename, drag to reorder, delete, add). One form per row, dispatched by `intent`.    |
| `/admin/lessons/:lessonId`   | Block editor + live preview. `save-draft` posts the block array as JSON; `upload` is a per-card fetcher returning `{ assetId, url }`. |
| `/admin/publish`             | Checkbox list of subjects with pending changes (all checked); one submit publishes them all.                                          |

## Block editor

`app/components/content-editor/BlockEditor.tsx` holds `ContentBlock[]` in state, renders a typed
card per block (heading, paragraph, quote, image, list) with move/remove and an optional per-block
direction, and previews with `LessonContent`. Rich text is edited as plain markup
(`**bold**`, `*italic*`, `==highlight==`, backslash escapes) via `app/shared/inline-markup.ts`;
quote highlights use `==…==` converted to offsets. An image card with no upload disables saving.

## Testing

Unit: inline markup, admin schemas, upload sniffing. DB: admin structure helpers, drafts, publishing,
learner visibility of unpublished rows. Routes: direct action calls with a `RouterContextProvider`
(USER → 403; create/dispatch/publish). UI (jsdom): block editor add/edit/move/remove and preview.
