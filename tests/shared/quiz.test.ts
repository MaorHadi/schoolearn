import { describe, expect, it } from "vitest";
import { gradeQuiz } from "~/shared/quiz";

const answerKey = [
  { id: 1, correctOptionIds: [11] },
  { id: 2, correctOptionIds: [21, 22] },
  { id: 3, correctOptionIds: [31] },
];

describe("gradeQuiz", () => {
  it("scores the whole percent of fully correct questions", () => {
    const grade = gradeQuiz(
      answerKey,
      new Map([
        [1, [11]],
        [2, [22, 21]],
        [3, [32]],
      ]),
    );
    expect(grade.score).toBe(67);
    expect(grade.results.map((result) => result.correct)).toEqual([true, true, false]);
    expect(grade.results[2]).toEqual({
      questionId: 3,
      correct: false,
      selectedOptionIds: [32],
      correctOptionIds: [31],
    });
  });

  it("treats a multiple-answer question as all or nothing", () => {
    const partial = gradeQuiz(answerKey, new Map([[2, [21]]]));
    const withExtra = gradeQuiz(answerKey, new Map([[2, [21, 22, 23]]]));
    expect(partial.results[1]?.correct).toBe(false);
    expect(withExtra.results[1]?.correct).toBe(false);
  });

  it("counts unanswered questions as wrong and ignores duplicate selections", () => {
    expect(gradeQuiz(answerKey, new Map()).score).toBe(0);
    expect(gradeQuiz(answerKey, new Map([[1, [11, 11]]])).results[0]?.correct).toBe(true);
    expect(gradeQuiz([], new Map()).score).toBe(0);
  });

  it("gives 100 when everything is right", () => {
    const grade = gradeQuiz(
      answerKey,
      new Map([
        [1, [11]],
        [2, [21, 22]],
        [3, [31]],
      ]),
    );
    expect(grade.score).toBe(100);
  });
});
