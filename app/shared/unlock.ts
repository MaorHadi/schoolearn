// Shared (client-safe). The single source of truth for progression rules.
//
// Rules:
//  - Lesson 1 of Section 1 is always unlocked.
//  - A lesson is unlocked when the previous lesson in its section (by sortOrder) is completed.
//  - A section is unlocked when the previous section (by sortOrder) is completed,
//    i.e. every lesson in it is completed. An empty section counts as completed.
//  - Completion is permanent: it is derived from LessonProgress.completedAt, which is never cleared.

interface LessonNode {
  id: number;
  title: string;
  sortOrder: number;
  passingScore: number | null;
  /** False for reading-only lessons: completed by moving on, and no score is shown. */
  hasQuestions: boolean;
}

export interface SectionNode {
  id: number;
  title: string;
  sortOrder: number;
  lessons: LessonNode[];
}

interface ProgressRow {
  lessonId: number;
  bestScore: number;
  completedAt: Date | null;
}

export interface LessonState extends LessonNode {
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
}

export interface SectionState extends Omit<SectionNode, "lessons"> {
  unlocked: boolean;
  completed: boolean;
  lessons: LessonState[];
}

const bySortOrder = <T extends { sortOrder: number }>(left: T, right: T) =>
  left.sortOrder - right.sortOrder;

export function computeTree(sections: SectionNode[], progress: ProgressRow[]): SectionState[] {
  const progressByLesson = new Map(progress.map((row) => [row.lessonId, row]));
  const orderedSections = [...sections].sort(bySortOrder);
  let previousSectionCompleted = true; // so the first section is unlocked

  return orderedSections.map((section) => {
    const sectionUnlocked = previousSectionCompleted;
    let previousLessonCompleted = true; // so the first lesson of an unlocked section is unlocked

    const lessons: LessonState[] = [...section.lessons].sort(bySortOrder).map((lessonNode) => {
      const row = progressByLesson.get(lessonNode.id);
      const completed = row?.completedAt != null;
      const unlocked = sectionUnlocked && previousLessonCompleted;
      previousLessonCompleted = completed;
      return { ...lessonNode, unlocked, completed, bestScore: row?.bestScore ?? null };
    });

    const completed = lessons.every((lessonState) => lessonState.completed);
    previousSectionCompleted = completed;

    return {
      id: section.id,
      title: section.title,
      sortOrder: section.sortOrder,
      unlocked: sectionUnlocked,
      completed,
      lessons,
    };
  });
}

/** The lesson's state anywhere in the tree, or null. */
export function findLesson(tree: SectionState[], lessonId: number): LessonState | null {
  for (const section of tree) {
    for (const lessonState of section.lessons) {
      if (lessonState.id === lessonId) return lessonState;
    }
  }
  return null;
}

/**
 * The lesson that follows `lessonId` in path order: the next one in its section, else the first
 * lesson of the next non-empty section. Null when it is the last lesson of the subject.
 */
export function findNextLesson(tree: SectionState[], lessonId: number): LessonState | null {
  const flat = tree.flatMap((section) => section.lessons);
  const index = flat.findIndex((lessonState) => lessonState.id === lessonId);
  if (index === -1) return null;
  return flat[index + 1] ?? null;
}

export function isLessonUnlocked(tree: SectionState[], lessonId: number): boolean {
  return findLesson(tree, lessonId)?.unlocked ?? false;
}
