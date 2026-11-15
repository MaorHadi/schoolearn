import type { LessonContent } from "../../app/schemas/content-blocks";
import type { LessonQuestions } from "../../app/schemas/questions";

export interface SeedLesson {
  title: string;
  sortOrder: number;
  passingScore?: number;
  /** The lesson's quiz. Lessons without one are completed by reading them. */
  questions?: LessonQuestions;
  /** Receives the placeholder asset id so image blocks can reference it. */
  content: (assetId: number) => LessonContent;
}

export interface SeedSection {
  title: string;
  sortOrder: number;
  lessons: SeedLesson[];
}

export interface SeedSubject {
  slug: string;
  name: string;
  description: string;
  locale: string;
  direction: "rtl" | "ltr";
  /** Validated by SubjectThemeSchema at seed time. */
  accentColor: string;
  icon: string;
  sections: SeedSection[];
}
