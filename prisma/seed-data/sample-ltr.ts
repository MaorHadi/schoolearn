// Subject 2: a deliberately different demo subject (English, LTR, 2 sections of 3 and 2 lessons).
// It proves the platform is subject-agnostic. Remove or replace it once real subjects exist.
import type { LessonContent } from "../../app/schemas/content-blocks";
import type { SeedLesson, SeedSubject } from "./types";

function lesson(title: string, sortOrder: number, passingScore?: number): SeedLesson {
  return {
    title,
    sortOrder,
    ...(passingScore !== undefined ? { passingScore } : {}),
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
  sortOrder: 99,
  accentColor: "#059669",
  icon: "flask-conical",
  sections: [
    {
      title: "Basics",
      sortOrder: 1,
      lessons: [lesson("Intro", 1), lesson("Terms", 2, 70), lesson("Review", 3)],
    },
    {
      title: "Advanced",
      sortOrder: 2,
      lessons: [lesson("Deep dive", 1), lesson("Synthesis", 2, 80)],
    },
  ],
};
