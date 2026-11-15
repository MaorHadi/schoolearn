// Shared (client-safe). Grading rule for a lesson's quiz; the only place a score is computed.
import type { QuestionType } from "~/schemas/questions";

interface AnswerKeyQuestion {
  id: number;
  correctOptionIds: number[];
}

interface QuestionResult {
  questionId: number;
  correct: boolean;
  selectedOptionIds: number[];
  correctOptionIds: number[];
}

interface QuizGrade {
  /** Whole percent of questions answered correctly. */
  score: number;
  results: QuestionResult[];
}

/** A question as the learner sees it: no hint of which options are correct. */
export interface QuizQuestion {
  id: number;
  type: QuestionType;
  prompt: string;
  options: { id: number; text: string }[];
}

/** What submitting the quiz answers with: a validation problem, or the graded attempt. */
export type QuizOutcome =
  | {
      kind: "error";
      /** Translation key of the message. */
      error: "lesson.quiz.unanswered" | "lesson.quiz.changed";
      unanswered: number[];
    }
  | {
      kind: "result";
      score: number;
      passed: boolean;
      passingScore: number;
      results: QuestionResult[];
    };

/**
 * A question is correct only when the selected options are exactly the correct ones (so a
 * multiple-answer question is all or nothing). An unanswered question is wrong.
 */
export function gradeQuiz(
  answerKey: AnswerKeyQuestion[],
  answers: ReadonlyMap<number, number[]>,
): QuizGrade {
  const results = answerKey.map((question): QuestionResult => {
    const selectedOptionIds = [...new Set(answers.get(question.id) ?? [])];
    const correct =
      selectedOptionIds.length === question.correctOptionIds.length &&
      question.correctOptionIds.every((optionId) => selectedOptionIds.includes(optionId));
    return {
      questionId: question.id,
      correct,
      selectedOptionIds,
      correctOptionIds: question.correctOptionIds,
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const score = results.length === 0 ? 0 : Math.round((correctCount / results.length) * 100);
  return { score, results };
}
