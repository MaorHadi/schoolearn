/**
 * Admin-side writers for the content hierarchy, one file per table under ./admin/. Together they
 * are the only place that creates, renames, reorders, or deletes Subject / Section / Lesson rows
 * and the only writer of `Lesson.draftContent`. `Lesson.content` is written only by publishing.
 *
 * New sections and lessons start with `publishedAt = null`, so learners cannot see them until the
 * subject is published. Metadata edits (titles, order, theme) apply immediately.
 */
export * from "./admin/subject.server";
export * from "./admin/section.server";
export * from "./admin/lesson.server";
export type { MoveDirection } from "~/shared/ordering";
