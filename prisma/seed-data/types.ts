import type { LessonContent } from "../../app/schemas/content-blocks";

export interface SeedLesson {
  title: string;
  sortOrder: number;
  passingScore?: number;
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
