// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { QuizRunner } from "~/components/quiz/QuizRunner";
import { t } from "~/i18n";
import type { QuizOutcome, QuizQuestion } from "~/shared/quiz";

afterEach(cleanup);

const questions: QuizQuestion[] = [
  {
    id: 1,
    type: "MULTIPLE_CHOICE",
    prompt: "Pick one",
    options: [
      { id: 11, text: "A" },
      { id: 12, text: "B" },
    ],
  },
  {
    id: 2,
    type: "MULTIPLE_ANSWER",
    prompt: "Pick all",
    options: [
      { id: 21, text: "X" },
      { id: 22, text: "Y" },
    ],
  },
];

function renderQuiz(outcome?: QuizOutcome) {
  const posted: [string, FormDataEntryValue][][] = [];
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <QuizRunner questions={questions} passingScore={60} direction="ltr" outcome={outcome} />
      ),
      action: async ({ request }) => {
        posted.push([...(await request.formData()).entries()]);
        return null;
      },
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
  return posted;
}

describe("QuizRunner", () => {
  it("shows radios for a single-answer question and checkboxes for a multiple-answer one", () => {
    renderQuiz();
    const single = screen.getByRole("group", { name: /Pick one/ });
    const multiple = screen.getByRole("group", { name: /Pick all/ });
    expect(within(single).getAllByRole("radio")).toHaveLength(2);
    expect(within(multiple).getAllByRole("checkbox")).toHaveLength(2);
    expect(multiple.parentElement).toHaveTextContent(t("lesson.quiz.multipleHint"));
    expect(screen.getByText(t("lesson.quiz.lead", { passing: 60 }))).toBeTruthy();
  });

  it("posts the shown question ids and the chosen options with the answer intent", async () => {
    const posted = renderQuiz();
    fireEvent.click(screen.getByRole("radio", { name: "B" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "X" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Y" }));
    fireEvent.click(screen.getByRole("button", { name: t("lesson.quiz.submit") }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toEqual([
      ["intent", "answer"],
      ["questionId", "1"],
      ["question-1", "12"],
      ["questionId", "2"],
      ["question-2", "21"],
      ["question-2", "22"],
    ]);
  });

  it("marks unanswered questions when the server asks for them", () => {
    renderQuiz({ kind: "error", error: "lesson.quiz.unanswered", unanswered: [2] });
    expect(screen.getByText(t("lesson.quiz.unanswered"))).toBeTruthy();
    expect(screen.getAllByText(t("lesson.quiz.unansweredQuestion"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: t("lesson.quiz.submit") })).toBeEnabled();
  });

  it("shows a graded attempt read-only with the correct answers of wrong questions", () => {
    renderQuiz({
      kind: "result",
      score: 50,
      passed: false,
      passingScore: 60,
      results: [
        { questionId: 1, correct: true, selectedOptionIds: [12], correctOptionIds: [12] },
        { questionId: 2, correct: false, selectedOptionIds: [21], correctOptionIds: [21, 22] },
      ],
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      t("lesson.quiz.failed", { score: 50, passing: 60 }),
    );
    expect(screen.getByRole("radio", { name: "B" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "B" })).toBeDisabled();
    expect(screen.getAllByText(t("lesson.quiz.correct"))).toHaveLength(1);
    expect(screen.getAllByText(t("lesson.quiz.wrong"))).toHaveLength(1);
    // Both correct options of the wrong question are pointed out, none on the right one.
    expect(screen.getAllByText(t("lesson.quiz.correctAnswer"))).toHaveLength(2);
    expect(screen.queryByRole("button", { name: t("lesson.quiz.submit") })).toBeNull();
    expect(screen.getByRole("link", { name: t("lesson.quiz.retry") })).toBeTruthy();
  });

  it("offers a reload when the quiz changed", () => {
    renderQuiz({ kind: "error", error: "lesson.quiz.changed", unanswered: [] });
    expect(screen.getByRole("link", { name: t("lesson.quiz.reload") })).toBeTruthy();
  });
});
