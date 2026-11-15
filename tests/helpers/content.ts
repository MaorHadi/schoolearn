import type { LessonQuestions } from "~/schemas/questions";
import { prisma } from "~/server/database.server";

/** Two valid questions: one single-answer (correct: "B") and one multiple-answer (correct: "X", "Y"). */
export function sampleQuestions(): LessonQuestions {
  return [
    {
      id: "q1",
      type: "MULTIPLE_CHOICE",
      prompt: "Pick one",
      options: [
        { id: "a", text: "A", isCorrect: false },
        { id: "b", text: "B", isCorrect: true },
        { id: "c", text: "C", isCorrect: false },
      ],
    },
    {
      id: "q2",
      type: "MULTIPLE_ANSWER",
      prompt: "Pick all",
      options: [
        { id: "x", text: "X", isCorrect: true },
        { id: "y", text: "Y", isCorrect: true },
        { id: "z", text: "Z", isCorrect: false },
      ],
    },
  ];
}

/**
 * Create a throwaway subject with the given number of lessons per section.
 * Published (visible to learners) unless `published` is false.
 */
export async function makeSubjectWithLessons(
  lessonsPerSection: number[],
  passingScore: number | null = null,
  published = true,
) {
  const publishedAt = published ? new Date() : null;
  const subject = await prisma.subject.create({
    data: {
      slug: "t-" + Math.random().toString(36).slice(2, 8),
      name: "Test subject",
      locale: "en",
      direction: "ltr",
      isActive: published,
      publishedAt,
    },
  });
  const lessonIds: number[][] = [];
  for (let sectionIndex = 0; sectionIndex < lessonsPerSection.length; sectionIndex++) {
    const section = await prisma.section.create({
      data: {
        subjectId: subject.id,
        title: `S${sectionIndex + 1}`,
        sortOrder: sectionIndex + 1,
        publishedAt,
      },
    });
    const ids: number[] = [];
    const count = lessonsPerSection[sectionIndex] ?? 0;
    for (let lessonIndex = 0; lessonIndex < count; lessonIndex++) {
      const created = await prisma.lesson.create({
        data: {
          sectionId: section.id,
          title: `L${lessonIndex + 1}`,
          sortOrder: lessonIndex + 1,
          passingScore,
          content: [],
          publishedAt,
        },
      });
      ids.push(created.id);
    }
    lessonIds.push(ids);
  }
  return { subject, lessonIds };
}

/** The first bytes of a PNG file, enough for the upload sniffer to accept a buffer as an image. */
export const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The id of a fixture lesson by section and position (both 0-based); throws when it is missing. */
export function lessonAt(lessonIds: number[][], section = 0, lesson = 0): number {
  const id = lessonIds[section]?.[lesson];
  if (id === undefined) throw new Error("fixture missing lesson");
  return id;
}
