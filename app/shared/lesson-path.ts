// Shared (client-safe). Presentation helpers over the unlock tree.
import type { LessonState, SectionState } from "./unlock";

export type StationState = "completed" | "current" | "available" | "locked";

/** The lesson a student should do next: first unlocked lesson that is not yet completed. */
export function findCurrentLesson(tree: SectionState[]): LessonState | null {
  for (const section of tree) {
    for (const lesson of section.lessons) {
      if (lesson.unlocked && !lesson.completed) return lesson;
    }
  }
  return null;
}

export function stationState(lesson: LessonState, currentId: number | null): StationState {
  if (lesson.completed) return "completed";
  if (!lesson.unlocked) return "locked";
  return lesson.id === currentId ? "current" : "available";
}

export function countCompleted(tree: SectionState[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const section of tree) {
    for (const lesson of section.lessons) {
      total += 1;
      if (lesson.completed) done += 1;
    }
  }
  return { done, total };
}
