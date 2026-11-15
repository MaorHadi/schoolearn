// Client-safe. The shape of a lesson's question list as the admin editor edits it and as it is
// stored in Lesson.draftQuestions. Publishing turns it into Question / QuestionOption rows.
import { z } from "zod";

export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "MULTIPLE_ANSWER"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const PROMPT_MAX_LENGTH = 1000;
export const OPTION_MAX_LENGTH = 300;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_QUESTIONS = 50;

/** Editor-side key (React key, drag and drop); never stored on the Question rows. */
const draftId = z.string().min(1).max(64);

export const QuestionOptionDraftSchema = z.object({
  id: draftId,
  text: z.string().trim().min(1).max(OPTION_MAX_LENGTH),
  isCorrect: z.boolean(),
});
export type QuestionOptionDraft = z.infer<typeof QuestionOptionDraftSchema>;

/** MULTIPLE_CHOICE has exactly one correct option; MULTIPLE_ANSWER has at least one. */
export const QuestionDraftSchema = z
  .object({
    id: draftId,
    type: z.enum(QUESTION_TYPES),
    prompt: z.string().trim().min(1).max(PROMPT_MAX_LENGTH),
    options: z.array(QuestionOptionDraftSchema).min(MIN_OPTIONS).max(MAX_OPTIONS),
  })
  .superRefine((question, context) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    const valid = question.type === "MULTIPLE_CHOICE" ? correctCount === 1 : correctCount >= 1;
    if (!valid) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "wrong number of correct options for the question type",
      });
    }
  });
export type QuestionDraft = z.infer<typeof QuestionDraftSchema>;

export const LessonQuestionsSchema = z.array(QuestionDraftSchema).max(MAX_QUESTIONS);
export type LessonQuestions = z.infer<typeof LessonQuestionsSchema>;

/** The question editor posts its state as one JSON string. */
export const QuestionsFormSchema = z.object({
  questions: z
    .string()
    .transform((raw, context) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "questions must be JSON" });
        return z.NEVER;
      }
    })
    .pipe(LessonQuestionsSchema),
});

/** A learner's submitted option ids for one question. */
export const SelectedOptionIdsSchema = z.array(z.coerce.number().int().positive());
