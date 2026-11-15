// Shared vocabulary of the question editor: the save intent and the factories for new rows.
import type { QuestionDraft, QuestionOptionDraft, QuestionType } from "~/schemas/questions";
import { LessonQuestionsSchema, MIN_OPTIONS } from "~/schemas/questions";

export const SAVE_QUESTIONS_INTENT = "save-questions";

export function emptyOption(): QuestionOptionDraft {
  return { id: crypto.randomUUID(), text: "", isCorrect: false };
}

/** A new question starts with the minimum number of options and no correct one marked. */
export function emptyQuestion(): QuestionDraft {
  return {
    id: crypto.randomUUID(),
    type: "MULTIPLE_CHOICE",
    prompt: "",
    options: Array.from({ length: MIN_OPTIONS }, emptyOption),
  };
}

/** A single-answer question keeps one correct option at most: the first one that was marked. */
export function withType(question: QuestionDraft, type: QuestionType): QuestionDraft {
  if (type === "MULTIPLE_ANSWER") return { ...question, type };
  const firstCorrect = question.options.findIndex((option) => option.isCorrect);
  return {
    ...question,
    type,
    options: question.options.map((option, index) => ({
      ...option,
      isCorrect: index === firstCorrect,
    })),
  };
}

/** Mark an option correct or not; in a single-answer question marking one unmarks the others. */
export function withCorrect(
  question: QuestionDraft,
  optionId: string,
  isCorrect: boolean,
): QuestionDraft {
  return {
    ...question,
    options: question.options.map((option) => {
      if (option.id === optionId) return { ...option, isCorrect };
      return question.type === "MULTIPLE_CHOICE" && isCorrect
        ? { ...option, isCorrect: false }
        : option;
    }),
  };
}

/** The schema the server applies on save; the UI says so before the server does. */
export function questionsAreComplete(questions: QuestionDraft[]): boolean {
  return LessonQuestionsSchema.safeParse(questions).success;
}
