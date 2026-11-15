import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Form, Link, useFetcher } from "react-router";
import { RowStatusPill } from "~/components/admin/StatusPill";
import { DragHandle } from "~/components/content-editor/DragHandle";
import { useDragOrder } from "~/components/content-editor/useDragOrder";
import { Field } from "~/components/forms/Field";
import { IconButton } from "~/components/IconButton";
import { t, type TranslationKey } from "~/i18n";
import { TITLE_MAX_LENGTH } from "~/schemas/admin-content";
import type { TextDirection } from "~/shared/direction";
import { fieldErrorHelpers } from "~/shared/field-errors";
import { moveToPositionOf, swapWithNeighbour, type MoveDirection } from "~/shared/ordering";

type TreeField = "title" | "passingScore";

/** One message key per inline-form field, for `fieldErrorsFrom()` in the subject page action. */
export const TREE_FIELD_MESSAGES: Record<TreeField, TranslationKey> = {
  title: "admin.error.title",
  passingScore: "admin.error.passingScore",
};

/** Validation result of one inline form; `sectionId`/`lessonId` pin it to a single row. */
export interface TreeActionResult {
  kind: "tree";
  intent: string;
  sectionId?: number;
  lessonId?: number;
  fieldErrors: Partial<Record<TreeField, TranslationKey>>;
}

type RowErrors = Partial<Record<TreeField, TranslationKey>>;

/** Errors of the form identified by `intent` and (optionally) the row id; empty otherwise. */
function errorsFor(
  errors: TreeActionResult | undefined,
  intent: string,
  row?: { sectionId?: number; lessonId?: number },
): RowErrors {
  if (!errors || errors.intent !== intent) return {};
  if (row?.sectionId !== undefined && errors.sectionId !== row.sectionId) return {};
  if (row?.lessonId !== undefined && errors.lessonId !== row.lessonId) return {};
  return errors.fieldErrors;
}

interface TreeLesson {
  id: number;
  title: string;
  passingScore: number | null;
  publishedAt: Date | string | null;
  hasDraft: boolean;
}

export interface TreeSection {
  id: number;
  title: string;
  publishedAt: Date | string | null;
  lessons: TreeLesson[];
}

/** Submits the row's form with a delete intent. Native confirm keeps it from being accidental. */
function DeleteButton({
  intent,
  label,
  confirm,
}: {
  intent: string;
  label: string;
  confirm: string;
}) {
  return (
    <IconButton
      type="submit"
      name="intent"
      value={intent}
      label={label}
      icon={<Trash2 size={16} aria-hidden="true" />}
      danger
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    />
  );
}

type RowKind = "section" | "lesson";

/**
 * The order a list will have once the move being saved lands, so a dropped row does not snap
 * back while the request is in flight.
 */
function withPendingMove<Row extends { id: number }>(
  rows: Row[],
  kind: RowKind,
  formData: FormData | undefined,
): Row[] {
  if (!formData) return rows;
  const intent = formData.get("intent");
  const id = Number(formData.get(`${kind}Id`));
  if (intent === `reorder-${kind}`) {
    const targetId = Number(
      formData.get(kind === "section" ? "targetSectionId" : "targetLessonId"),
    );
    return moveToPositionOf(rows, id, targetId) ?? rows;
  }
  if (intent === `move-${kind}-up`) return swapWithNeighbour(rows, id, "up") ?? rows;
  if (intent === `move-${kind}-down`) return swapWithNeighbour(rows, id, "down") ?? rows;
  return rows;
}

/**
 * Drag-and-drop and keyboard ordering for one list of the tree. Each move is posted on its own
 * fetcher to the page action: "reorder-<kind>" for a drop, "move-<kind>-up|down" for the arrows.
 */
function useRowOrder<Row extends { id: number }>(rows: Row[], kind: RowKind) {
  const fetcher = useFetcher();
  const drag = useDragOrder<number>((sourceId, targetId) => {
    void fetcher.submit(
      kind === "section"
        ? { intent: "reorder-section", sectionId: sourceId, targetSectionId: targetId }
        : { intent: "reorder-lesson", lessonId: sourceId, targetLessonId: targetId },
      { method: "post" },
    );
  });
  const move = (id: number, direction: MoveDirection) => {
    void fetcher.submit(
      { intent: `move-${kind}-${direction}`, [`${kind}Id`]: id },
      { method: "post" },
    );
  };
  return { rows: withPendingMove(rows, kind, fetcher.formData), drag, move };
}

function LessonRow({
  lesson,
  direction,
  errors,
  rowProps,
  handle,
}: {
  lesson: TreeLesson;
  direction: TextDirection;
  errors: RowErrors;
  rowProps: ComponentProps<"li">;
  handle: ReactNode;
}) {
  const { errorFor, invalid } = fieldErrorHelpers(errors);
  return (
    <li className="tree-lesson" {...rowProps}>
      <Form method="post" className="tree-lesson__form" noValidate>
        <input type="hidden" name="lessonId" value={lesson.id} />
        {handle}
        <Field
          label={t("admin.lessons.titleLabel")}
          error={errorFor("title")}
          hideLabel
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            defaultValue={lesson.title}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={invalid("title")}
          />
        </Field>
        <Field
          label={t("admin.lessons.passingScore")}
          error={errorFor("passingScore")}
          hideLabel
          className="tree-field tree-field--score"
        >
          <input
            className="field__input field__input--compact"
            name="passingScore"
            type="number"
            min={0}
            max={100}
            placeholder="%"
            title={t("admin.lessons.passingScore")}
            defaultValue={lesson.passingScore ?? ""}
            aria-invalid={invalid("passingScore")}
          />
        </Field>
        <RowStatusPill publishedAt={lesson.publishedAt} hasDraft={lesson.hasDraft} />
        <span className="tree-actions">
          <button
            type="submit"
            name="intent"
            value="update-lesson"
            className="btn btn--ghost btn--small"
          >
            {t("admin.lessons.save")}
          </button>
          <Link to={`/admin/lessons/${lesson.id}`} className="btn btn--primary btn--small">
            <PencilLine size={16} aria-hidden="true" />
            {t("admin.lessons.edit")}
          </Link>
          <DeleteButton
            intent="delete-lesson"
            label={t("admin.lessons.delete")}
            confirm={t("admin.lessons.deleteConfirm")}
          />
        </span>
      </Form>
    </li>
  );
}

function SectionCard({
  section,
  direction,
  errors,
  rowProps,
  handle,
}: {
  section: TreeSection;
  direction: TextDirection;
  errors: TreeActionResult | undefined;
  rowProps: ComponentProps<"li">;
  handle: ReactNode;
}) {
  const row = { sectionId: section.id };
  const rename = fieldErrorHelpers(errorsFor(errors, "update-section", row));
  const add = fieldErrorHelpers(errorsFor(errors, "create-lesson", row));
  const lessonOrder = useRowOrder(section.lessons, "lesson");
  return (
    <li className="card tree-section" {...rowProps}>
      <Form method="post" className="tree-section__head" noValidate>
        <input type="hidden" name="sectionId" value={section.id} />
        {handle}
        <Field
          label={t("admin.lessons.titleLabel")}
          error={rename.errorFor("title")}
          hideLabel
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact tree-section__title"
            name="title"
            dir={direction}
            defaultValue={section.title}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={rename.invalid("title")}
          />
        </Field>
        <RowStatusPill publishedAt={section.publishedAt} />
        <span className="tree-actions">
          <button
            type="submit"
            name="intent"
            value="update-section"
            className="btn btn--ghost btn--small"
          >
            {t("admin.sections.rename")}
          </button>
          <DeleteButton
            intent="delete-section"
            label={t("admin.sections.delete")}
            confirm={t("admin.sections.deleteConfirm")}
          />
        </span>
      </Form>

      {section.lessons.length === 0 ? (
        <p className="muted tree-empty">{t("admin.lessons.empty")}</p>
      ) : (
        <ol className="tree-lessons">
          {lessonOrder.rows.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              direction={direction}
              errors={errorsFor(errors, "update-lesson", { lessonId: lesson.id })}
              rowProps={lessonOrder.drag.targetProps(lesson.id)}
              handle={
                <DragHandle
                  label={t("admin.lessons.drag")}
                  onMove={(moveDirection) => lessonOrder.move(lesson.id, moveDirection)}
                  {...lessonOrder.drag.handleProps(lesson.id)}
                />
              }
            />
          ))}
        </ol>
      )}

      <Form method="post" className="tree-add" noValidate>
        <input type="hidden" name="intent" value="create-lesson" />
        <input type="hidden" name="sectionId" value={section.id} />
        <Field
          label={t("admin.lessons.newTitle")}
          error={add.errorFor("title")}
          hideLabel
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            placeholder={t("admin.lessons.newTitle")}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={add.invalid("title")}
          />
        </Field>
        <button type="submit" className="btn btn--ghost btn--small">
          <Plus size={16} aria-hidden="true" />
          {t("admin.lessons.add")}
        </button>
      </Form>
    </li>
  );
}

/**
 * Sections and lessons of one subject with inline rename, delete, and add forms. Rows are
 * reordered by dragging their grip (lessons within their section, sections within the subject).
 */
export function StructureTree({
  sections,
  direction,
  errors,
}: {
  sections: TreeSection[];
  direction: TextDirection;
  /** Validation result of the last inline submit, shown only on the form it came from. */
  errors?: TreeActionResult;
}) {
  const add = fieldErrorHelpers(errorsFor(errors, "create-section"));
  const sectionOrder = useRowOrder(sections, "section");
  return (
    <section className="tree" aria-labelledby="tree-title">
      <h2 id="tree-title" className="section-title">
        {t("admin.sections.title")}
      </h2>
      <p className="muted">{t("admin.sections.lead")}</p>

      {sections.length === 0 ? (
        <p className="empty">{t("admin.sections.empty")}</p>
      ) : (
        <ol className="tree-sections">
          {sectionOrder.rows.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              direction={direction}
              errors={errors}
              rowProps={sectionOrder.drag.targetProps(section.id)}
              handle={
                <DragHandle
                  label={t("admin.sections.drag")}
                  onMove={(moveDirection) => sectionOrder.move(section.id, moveDirection)}
                  {...sectionOrder.drag.handleProps(section.id)}
                />
              }
            />
          ))}
        </ol>
      )}

      <Form method="post" className="tree-add tree-add--section" noValidate>
        <input type="hidden" name="intent" value="create-section" />
        <Field
          label={t("admin.sections.newTitle")}
          error={add.errorFor("title")}
          hideLabel
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            placeholder={t("admin.sections.newTitle")}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={add.invalid("title")}
          />
        </Field>
        <button type="submit" className="btn btn--primary btn--small">
          <Plus size={16} aria-hidden="true" />
          {t("admin.sections.add")}
        </button>
      </Form>
    </section>
  );
}
