// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { QuestionEditor } from "~/components/question-editor/QuestionEditor";
import { t } from "~/i18n";
import type { QuestionDraft } from "~/schemas/questions";
import { sampleQuestions } from "../helpers/content";

afterEach(cleanup);

const numbered = (key: Parameters<typeof t>[0], position: number) =>
  t(key).replace("{number}", String(position));

function renderEditor(questions: QuestionDraft[] = sampleQuestions()) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <QuestionEditor initialQuestions={questions} direction="ltr" />,
      action: () => null,
    },
  ]);
  const view = render(<Stub initialEntries={["/"]} />);
  const hidden = () => {
    const input = view.container.querySelector<HTMLInputElement>('input[name="questions"]');
    if (!input) throw new Error("hidden questions input missing");
    return JSON.parse(input.value) as QuestionDraft[];
  };
  const cards = () => screen.getAllByRole("listitem");
  const save = () => screen.getByRole("button", { name: t("admin.editor.saveDraft") });
  return { hidden, cards, save };
}

describe("QuestionEditor", () => {
  it("posts the initial questions as JSON and can be saved", () => {
    const { hidden, save } = renderEditor();
    expect(hidden()).toEqual(sampleQuestions());
    expect(save()).toBeEnabled();
  });

  it("adds a question that must be completed before saving", () => {
    const { hidden, cards, save } = renderEditor([]);
    expect(screen.getByText(t("admin.questions.empty"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t("admin.questions.add") }));

    expect(hidden()).toHaveLength(1);
    expect(save()).toBeDisabled();
    expect(screen.getByText(t("admin.questions.incomplete"))).toBeTruthy();

    const [card] = cards();
    if (!card) throw new Error("card missing");
    const inCard = within(card);
    fireEvent.change(inCard.getByLabelText(t("admin.questions.prompt")), {
      target: { value: "Why?" },
    });
    fireEvent.change(inCard.getByLabelText(numbered("admin.questions.optionText", 1)), {
      target: { value: "Because" },
    });
    fireEvent.change(inCard.getByLabelText(numbered("admin.questions.optionText", 2)), {
      target: { value: "No reason" },
    });
    expect(save()).toBeDisabled(); // no correct answer marked yet
    fireEvent.click(inCard.getByLabelText(numbered("admin.questions.optionCorrect", 1)));

    expect(save()).toBeEnabled();
    expect(hidden()[0]).toMatchObject({
      type: "MULTIPLE_CHOICE",
      prompt: "Why?",
      options: [
        { text: "Because", isCorrect: true },
        { text: "No reason", isCorrect: false },
      ],
    });
  });

  it("keeps one correct answer in a single-answer question and several in a multiple-answer one", () => {
    const { hidden, cards } = renderEditor();
    const [single, multiple] = cards();
    if (!single || !multiple) throw new Error("card missing");
    const correctOf = (index: number) => hidden()[index]?.options.map((option) => option.isCorrect);

    fireEvent.click(within(single).getByLabelText(numbered("admin.questions.optionCorrect", 3)));
    expect(correctOf(0)).toEqual([false, false, true]);

    fireEvent.click(within(multiple).getByLabelText(numbered("admin.questions.optionCorrect", 3)));
    expect(correctOf(1)).toEqual([true, true, true]);

    // Switching to a single answer keeps only the first correct option.
    fireEvent.change(within(multiple).getByLabelText(t("admin.questions.type")), {
      target: { value: "MULTIPLE_CHOICE" },
    });
    expect(hidden()[1]?.type).toBe("MULTIPLE_CHOICE");
    expect(correctOf(1)).toEqual([true, false, false]);
  });

  it("adds and removes options within the allowed range, and removes questions", () => {
    const { hidden, cards } = renderEditor();
    const [single] = cards();
    if (!single) throw new Error("card missing");
    const inCard = within(single);

    fireEvent.click(inCard.getByRole("button", { name: t("admin.questions.addOption") }));
    expect(hidden()[0]?.options).toHaveLength(4);
    fireEvent.click(
      inCard.getByRole("button", { name: numbered("admin.questions.removeOption", 4) }),
    );
    fireEvent.click(
      inCard.getByRole("button", { name: numbered("admin.questions.removeOption", 3) }),
    );
    expect(hidden()[0]?.options.map((option) => option.text)).toEqual(["A", "B"]);
    expect(
      inCard.getByRole("button", { name: numbered("admin.questions.removeOption", 1) }),
    ).toBeDisabled();

    fireEvent.click(inCard.getByRole("button", { name: t("admin.questions.remove") }));
    expect(hidden().map((question) => question.prompt)).toEqual(["Pick all"]);
  });

  it("reorders questions with the keyboard on the handle and by drag and drop", () => {
    const { hidden, cards } = renderEditor();
    const prompts = () => hidden().map((question) => question.prompt);
    const handles = () => screen.getAllByRole("button", { name: t("admin.questions.drag") });

    const [firstHandle] = handles();
    if (!firstHandle) throw new Error("handle missing");
    fireEvent.keyDown(firstHandle, { key: "ArrowDown" });
    expect(prompts()).toEqual(["Pick all", "Pick one"]);

    const [, draggedHandle] = handles();
    const [targetCard] = cards();
    if (!draggedHandle || !targetCard) throw new Error("row missing");
    fireEvent.dragStart(draggedHandle);
    fireEvent.dragEnter(targetCard);
    expect(targetCard).toHaveAttribute("data-drag", "target");
    fireEvent.drop(targetCard);
    expect(prompts()).toEqual(["Pick one", "Pick all"]);
  });
});
