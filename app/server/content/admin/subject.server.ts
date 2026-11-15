import { isMissingRow, isUniqueViolation, prisma } from "~/server/database.server";
import type { SubjectTheme } from "~/shared/subject-theme";

/** Admin writers and readers for the Subject table. Only this file creates, updates, or deletes one. */

export interface SubjectInput extends SubjectTheme {
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  direction: "rtl" | "ltr";
  defaultPassingScore: number | null;
}

export type CreateResult =
  { ok: true; id: number } | { ok: false; reason: "SLUG_TAKEN" | "NOT_FOUND" };
export type UpdateResult = { ok: true } | { ok: false; reason: "SLUG_TAKEN" | "NOT_FOUND" };

export interface AdminSubjectListItem {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  publishedAt: Date | null;
  /** Something would change for learners if the subject were published now. */
  hasPendingChanges: boolean;
}

/** Subjects are listed alphabetically by name, here and for learners. */
export async function listSubjectsForAdmin(): Promise<AdminSubjectListItem[]> {
  const subjects = await prisma.subject.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      publishedAt: true,
      sections: {
        select: {
          publishedAt: true,
          lessons: { select: { publishedAt: true, draftContent: true, draftQuestions: true } },
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
            (lesson) =>
              lesson.publishedAt === null ||
              lesson.draftContent !== null ||
              lesson.draftQuestions !== null,
          ),
      ),
  }));
}

/** New subjects start hidden (`isActive: false`) until published. */
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

/** The subject with its sections and lessons in display order, for the structure tree. */
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
              draftQuestions: true,
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
      lessons: section.lessons.map(({ draftContent, draftQuestions, ...lesson }) => ({
        ...lesson,
        hasDraft: draftContent !== null || draftQuestions !== null,
      })),
    })),
  };
}
