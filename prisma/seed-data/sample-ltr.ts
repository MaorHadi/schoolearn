// Subject 2: a deliberately different demo subject (English, LTR, 2 sections of 3 and 2 lessons).
// It proves the platform is subject-agnostic. Remove or replace it once real subjects exist.
import type { LessonContent } from "../../app/schemas/content-blocks";
import type { LessonQuestions } from "../../app/schemas/questions";
import type { SeedLesson, SeedSubject } from "./types";

/** A short quiz about the placeholder content every lesson of this subject shares. */
const placeholderQuiz: LessonQuestions = [
  {
    id: "source",
    type: "MULTIPLE_CHOICE",
    prompt: "According to the quoted source, what shall not happen to a free man?",
    options: [
      { id: "seized", text: "He shall not be seized or imprisoned", isCorrect: true },
      { id: "taxed", text: "He shall not be taxed", isCorrect: false },
      { id: "questioned", text: "He shall not be questioned", isCorrect: false },
    ],
  },
  {
    id: "list",
    type: "MULTIPLE_ANSWER",
    prompt: "Which items appear in the list at the end of the lesson?",
    options: [
      { id: "first", text: "First item", isCorrect: true },
      { id: "second", text: "Second item", isCorrect: true },
      { id: "third", text: "Third item", isCorrect: false },
    ],
  },
];

function lesson(
  title: string,
  sortOrder: number,
  passingScore?: number,
  questions?: LessonQuestions,
): SeedLesson {
  return {
    title,
    sortOrder,
    ...(passingScore !== undefined ? { passingScore } : {}),
    ...(questions ? { questions } : {}),
    content: (assetId: number): LessonContent => [
      { id: `${sortOrder}-heading`, type: "heading", level: 1, text: title },
      {
        id: `${sortOrder}-intro`,
        type: "paragraph",
        content: [
          { text: "Placeholder paragraph with ", marks: [] },
          { text: "bold", marks: ["bold"] },
          { text: " and ", marks: [] },
          { text: "highlight", marks: ["highlight"] },
          { text: ".", marks: [] },
        ],
      },
      {
        id: `${sortOrder}-quote`,
        type: "quote",
        sourceLabel: "Primary source",
        reference: "Sample Act, s.1",
        text: "No free man shall be seized or imprisoned.",
        highlights: [{ start: 3, end: 11 }],
      },
      {
        // Per-block direction override inside an LTR subject.
        id: `${sortOrder}-rtl`,
        type: "paragraph",
        dir: "rtl",
        content: [{ text: "פסקה זו מדגימה כיווניות שונה בתוך מקצוע באנגלית.", marks: [] }],
      },
      {
        id: `${sortOrder}-image`,
        type: "image",
        assetId,
        alt: "Placeholder image",
        caption: "Sample caption",
      },
      {
        id: `${sortOrder}-list`,
        type: "list",
        ordered: false,
        items: [[{ text: "First item", marks: [] }], [{ text: "Second item", marks: ["italic"] }]],
      },
    ],
  };
}

export const sampleLtr: SeedSubject = {
  slug: "sample-ltr",
  name: "Sample Subject (LTR demo)",
  description: "Demo subject proving the platform is subject-agnostic. Remove or replace later.",
  locale: "en",
  direction: "ltr",
  accentColor: "#059669",
  icon: "flask-conical",
  sections: [
    {
      title: "Basics",
      sortOrder: 1,
      lessons: [
        lesson("Intro", 1, undefined, placeholderQuiz),
        lesson("Terms", 2, 70, placeholderQuiz),
        lesson("Review", 3),
      ],
    },
    {
      title: "Advanced",
      sortOrder: 2,
      lessons: [lesson("Deep dive", 1), lesson("Synthesis", 2, 80)],
    },
  ],
};
