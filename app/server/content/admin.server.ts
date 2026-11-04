import { Prisma } from "../../../prisma/generated/client/client";
import {
  extractAssetIds,
  LessonContent as LessonContentSchema,
  type LessonContent,
} from "~/schemas/content-blocks";
import { prisma } from "~/server/database.server";
import { assetsExist, parseLessonContent } from "~/server/lesson-content.server";
import { assetUrlMap } from "~/server/storage/assets.server";
import type { SubjectTheme } from "~/shared/subject-theme";

/**
 * Admin-side writers for the content hierarchy. This module is the only place that creates,
 * renames, reorders, or deletes Subject / Section / Lesson rows and the only writer of
 * `Lesson.draftContent`. `Lesson.content` itself is written only by publishing
 * (publish.server.ts -> saveLessonContent).
 *
 * New sections and lessons start with `publishedAt = null`, so learners cannot see them until the
 * subject is published. Metadata edits (titles, order, theme) apply immediately.
 */

export interface SubjectInput extends SubjectTheme {
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  direction: "rtl" | "ltr";
  sortOrder: number;
}

export interface LessonInput {
  title: string;
  passingScore: number | null;
}

export type MoveDirection = "up" | "down";

export type CreateResult =
  { ok: true; id: number } | { ok: false; reason: "SLUG_TAKEN" | "NOT_FOUND" };
export type UpdateResult = { ok: true } | { ok: false; reason: "SLUG_TAKEN" | "NOT_FOUND" };
export type DraftResult = { ok: true } | { ok: false; reason: "NOT_FOUND" | "UNKNOWN_ASSET" };

export interface AdminSubjectListItem {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  publishedAt: Date | null;
  /** Something would change for learners if the subject were published now. */
  hasPendingChanges: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isMissingRow(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function listSubjectsForAdmin(): Promise<AdminSubjectListItem[]> {
  const subjects = await prisma.subject.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
      isActive: true,
      publishedAt: true,
      sections: {
        select: {
          publishedAt: true,
          lessons: { select: { publishedAt: true, draftContent: true } },
        },
      },
    },
  });
  return subjects.map(({ sections, ...subject }) => ({
    ...subject,
    hasPendingChanges:
      !subject.isActive ||
      sections.some(
        (section) =>
          section.publishedAt === null ||
          section.lessons.some(
            (lesson) => lesson.publishedAt === null || lesson.draftContent !== null,
          ),
      ),
  }));
}

export async function createSubject(input: SubjectInput): Promise<CreateResult> {
  try {
    const created = await prisma.subject.create({ data: input, select: { id: true } });
    return { ok: true, id: created.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "SLUG_TAKEN" };
    throw error;
  }
}

export async function updateSubject(id: number, input: SubjectInput): Promise<UpdateResult> {
  try {
    await prisma.subject.update({ where: { id }, data: input, select: { id: true } });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "SLUG_TAKEN" };
    if (isMissingRow(error)) return { ok: false, reason: "NOT_FOUND" };
    throw error;
  }
}

/** Cascades to sections, lessons, progress, and attempts. */
export async function deleteSubject(id: number): Promise<boolean> {
  const { count } = await prisma.subject.deleteMany({ where: { id } });
  return count === 1;
}

export async function getSubjectForAdmin(id: number) {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          sortOrder: true,
          publishedAt: true,
          lessons: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              sortOrder: true,
              passingScore: true,
              publishedAt: true,
              draftContent: true,
            },
          },
        },
      },
    },
  });
  if (!subject) return null;
  return {
    ...subject,
    sections: subject.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map(({ draftContent, ...lesson }) => ({
        ...lesson,
        hasDraft: draftContent !== null,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function createSection(subjectId: number, title: string): Promise<CreateResult> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) return { ok: false, reason: "NOT_FOUND" };
  const last = await prisma.section.aggregate({ where: { subjectId }, _max: { sortOrder: true } });
  const created = await prisma.section.create({
    data: { subjectId, title, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function updateSection(id: number, title: string): Promise<boolean> {
  const { count } = await prisma.section.updateMany({ where: { id }, data: { title } });
  return count === 1;
}

export async function deleteSection(id: number): Promise<boolean> {
  const { count } = await prisma.section.deleteMany({ where: { id } });
  return count === 1;
}

export async function moveSection(id: number, direction: MoveDirection): Promise<boolean> {
  const section = await prisma.section.findUnique({ where: { id }, select: { subjectId: true } });
  if (!section) return false;
  const siblings = await prisma.section.findMany({
    where: { subjectId: section.subjectId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const reordered = swapWithNeighbour(siblings, id, direction);
  if (!reordered) return false;
  await prisma.$transaction(
    reordered.map((row, index) =>
      prisma.section.update({ where: { id: row.id }, data: { sortOrder: index + 1 } }),
    ),
  );
  return true;
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function createLesson(sectionId: number, input: LessonInput): Promise<CreateResult> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) return { ok: false, reason: "NOT_FOUND" };
  const last = await prisma.lesson.aggregate({ where: { sectionId }, _max: { sortOrder: true } });
  const created = await prisma.lesson.create({
    data: { sectionId, ...input, sortOrder: (last._max.sortOrder ?? 0) + 1, content: [] },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function updateLesson(id: number, input: LessonInput): Promise<boolean> {
  const { count } = await prisma.lesson.updateMany({ where: { id }, data: input });
  return count === 1;
}

export async function deleteLesson(id: number): Promise<boolean> {
  const { count } = await prisma.lesson.deleteMany({ where: { id } });
  return count === 1;
}

export async function moveLesson(id: number, direction: MoveDirection): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { sectionId: true } });
  if (!lesson) return false;
  const siblings = await prisma.lesson.findMany({
    where: { sectionId: lesson.sectionId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const reordered = swapWithNeighbour(siblings, id, direction);
  if (!reordered) return false;
  await prisma.$transaction(
    reordered.map((row, index) =>
      prisma.lesson.update({ where: { id: row.id }, data: { sortOrder: index + 1 } }),
    ),
  );
  return true;
}

/**
 * Swap the row with its neighbour in the given direction. Returns the new order (the caller
 * rewrites sortOrder as 1..n, which also repairs duplicates), or null when already at the edge.
 */
function swapWithNeighbour<Row extends { id: number }>(
  rows: Row[],
  id: number,
  direction: MoveDirection,
): Row[] | null {
  const index = rows.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= rows.length) return null;
  const reordered = [...rows];
  const current = reordered[index];
  const neighbour = reordered[target];
  if (!current || !neighbour) return null;
  reordered[index] = neighbour;
  reordered[target] = current;
  return reordered;
}

// ---------------------------------------------------------------------------
// Lesson drafts
// ---------------------------------------------------------------------------

/** The lesson as the editor sees it: the draft when there is one, otherwise the live content. */
export async function getLessonForAdmin(id: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          id: true,
          title: true,
          subject: {
            select: { id: true, name: true, direction: true, accentColor: true, icon: true },
          },
        },
      },
    },
  });
  if (!lesson) return null;
  const hasDraft = lesson.draftContent !== null;
  const blocks = parseLessonContent(hasDraft ? lesson.draftContent : lesson.content);
  const assetUrls = await assetUrlMap(extractAssetIds(blocks));
  const { content: _content, draftContent: _draftContent, ...rest } = lesson;
  return { ...rest, blocks, hasDraft, assetUrls };
}

/** Validate and store an unpublished edit. Never touches `content` or `LessonAsset`. */
export async function saveLessonDraft(id: number, blocks: LessonContent): Promise<DraftResult> {
  const draftContent = LessonContentSchema.parse(blocks);
  if (!(await assetsExist(extractAssetIds(draftContent)))) {
    return { ok: false, reason: "UNKNOWN_ASSET" };
  }
  const { count } = await prisma.lesson.updateMany({ where: { id }, data: { draftContent } });
  return count === 1 ? { ok: true } : { ok: false, reason: "NOT_FOUND" };
}
