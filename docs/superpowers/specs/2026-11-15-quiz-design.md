# Quiz design (2026-11-15)

Questions at the end of a lesson, answered by learners and edited by ADMINs. Closes the core
loop of the foundation spec (read → answer → unlock) and resolves `TODO(quiz)`.

## Decisions

- Question edits are a **draft**, live only when the subject is published (same as content).
- Learners see **all questions under the lesson text and submit once**; retakes are unlimited.
- After a submit the learner sees the score, pass/fail, each question marked right or wrong, and
  the correct options of the questions they got wrong.
- Two types: `MULTIPLE_CHOICE` (exactly one correct option) and `MULTIPLE_ANSWER` (one or more
  correct options, all or nothing).
- Score = whole percent of fully correct questions. Passing is unchanged:
  `score >= lesson.passingScore ?? DEFAULT_LESSON_PASSING_SCORE`.

## Data

- `Question` / `QuestionOption` hold the **live** quiz. Migration `quiz` adds
  `QuestionType.MULTIPLE_ANSWER` and `Lesson.draftQuestions Json?` (`null` = nothing pending).
- Draft shape: `QuestionDraft[]` in `app/schemas/questions.ts` — `{ id, type, prompt, options:
[{ id, text, isCorrect }] }`, 2–6 options, at most 50 questions. The `id`s are editor keys only.
- Publishing **replaces** the lesson's question rows, so question and option ids change. An empty
  draft removes the quiz, and the lesson is again completed by reading it.

## Single writers

- `Question` / `QuestionOption`: `saveLessonQuestions()` in
  `app/server/lesson-questions.server.ts` (validates, replaces the rows, `sortOrder` 1..n; accepts
  a transaction client). Called by publishing and by the seed.
- `Lesson.draftQuestions`: `saveQuestionsDraft()` in `app/server/content/admin/question.server.ts`.
  `getQuestionsForAdmin()` returns the valid draft or else the live quiz, with `hasDraft` and
  `draftInvalid`.
- `publishSubject()` turns each question draft into the live quiz inside the subject's
  transaction; an invalid draft fails that subject with `INVALID_QUESTIONS`.
- A question draft counts as a pending change (`hasPendingChanges`, the tree's `hasDraft`).
- Scores are computed only by `gradeQuiz()` in `app/shared/quiz.ts` and recorded only through
  `recordAttempt()`.

## Learner route (`/subjects/:slug/lessons/:lessonId`)

- The loader returns the questions **without `isCorrect`**. The answer key
  (`getLessonAnswerKey()`) is read only inside the action.
- `answer` intent: the form posts one `questionId` per question shown and the chosen option ids
  as `question-<id>`. The action
  - answers 409 `lesson.quiz.changed` when the posted question ids are not the live ones
    (a publish happened since the page loaded),
  - throws 400 for an option of another question or two options on a single-answer question,
  - answers 400 `lesson.quiz.unanswered` with the unanswered question ids, recording nothing,
  - otherwise grades, calls `recordAttempt()`, and returns `{ score, passed, passingScore,
results }` as action data. No redirect: the result is shown in place and the revalidated
    loader unlocks `LessonNext`.
- `complete` intent is unchanged: question-less lessons, and moving on once completed. It still
  refuses an uncompleted lesson that has questions.
- UI: `app/components/quiz/QuizRunner.tsx`. Radios for single answer, checkboxes for multiple.
  A graded attempt is read-only; "try again" navigates to the same page for a clean form.

## Admin route (`/admin/lessons/:lessonId/questions`)

- `save-questions` posts the whole list as one JSON field, validated by `QuestionsFormSchema`;
  failures return `formError` so the editor keeps its state.
- UI: `app/components/question-editor/` (`QuestionEditor`, `QuestionCard`, `questions.ts`).
  Questions reorder by drag and drop or the arrow keys, through the shared `useDragOrder`.
  The save button is disabled until every question passes the schema.
- `LessonTabs` links the content editor and the question editor of a lesson.

## Not included

Other question types, per-question explanations, images in questions, shuffling, a history of
past attempts for the learner, and statistics for admins.
