import { describe, expect, it } from "vitest";
import {
  LessonQuestionsSchema,
  MAX_OPTIONS,
  QuestionDraftSchema,
  QuestionsFormSchema,
} from "~/schemas/questions";
import { sampleQuestions } from "../helpers/content";

const [single, multiple] = sampleQuestions();
if (!single || !multiple) throw new Error("fixture");

describe("QuestionDraftSchema", () => {
  it("accepts a single-answer and a multiple-answer question and trims text", () => {
    expect(QuestionDraftSchema.parse({ ...single, prompt: "  Pick one  " }).prompt).toBe(
      "Pick one",
    );
    expect(QuestionDraftSchema.safeParse(multiple).success).toBe(true);
  });

  it("requires exactly one correct option for a single-answer question", () => {
    const noneCorrect = single.options.map((option) => ({ ...option, isCorrect: false }));
    const twoCorrect = single.options.map((option) => ({ ...option, isCorrect: true }));
    expect(QuestionDraftSchema.safeParse({ ...single, options: noneCorrect }).success).toBe(false);
    expect(QuestionDraftSchema.safeParse({ ...single, options: twoCorrect }).success).toBe(false);
  });

  it("requires at least one correct option for a multiple-answer question", () => {
    const noneCorrect = multiple.options.map((option) => ({ ...option, isCorrect: false }));
    const oneCorrect = multiple.options.map((option, index) => ({
      ...option,
      isCorrect: index === 0,
    }));
    expect(QuestionDraftSchema.safeParse({ ...multiple, options: noneCorrect }).success).toBe(
      false,
    );
    expect(QuestionDraftSchema.safeParse({ ...multiple, options: oneCorrect }).success).toBe(true);
  });

  it("rejects empty text, too few or too many options, and unknown types", () => {
    const [first] = single.options;
    if (!first) throw new Error("fixture");
    expect(QuestionDraftSchema.safeParse({ ...single, prompt: "   " }).success).toBe(false);
    expect(QuestionDraftSchema.safeParse({ ...single, options: [first] }).success).toBe(false);
    const tooMany = Array.from({ length: MAX_OPTIONS + 1 }, (_unused, index) => ({
      id: `o${index}`,
      text: `Option ${index}`,
      isCorrect: index === 0,
    }));
    expect(QuestionDraftSchema.safeParse({ ...single, options: tooMany }).success).toBe(false);
    expect(QuestionDraftSchema.safeParse({ ...single, type: "ESSAY" }).success).toBe(false);
    const blankOption = [{ ...first, text: "" }, ...single.options.slice(1)];
    expect(QuestionDraftSchema.safeParse({ ...single, options: blankOption }).success).toBe(false);
  });
});

describe("QuestionsFormSchema", () => {
  it("parses a JSON question list and rejects malformed JSON or questions", () => {
    const questions = sampleQuestions();
    expect(QuestionsFormSchema.parse({ questions: JSON.stringify(questions) }).questions).toEqual(
      questions,
    );
    expect(LessonQuestionsSchema.parse([])).toEqual([]);
    expect(QuestionsFormSchema.safeParse({ questions: "[" }).success).toBe(false);
    expect(
      QuestionsFormSchema.safeParse({ questions: JSON.stringify([{ prompt: "x" }]) }).success,
    ).toBe(false);
  });
});
