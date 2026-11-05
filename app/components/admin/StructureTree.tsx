import { ArrowDown, ArrowUp, PencilLine, Plus, Trash2 } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Form, Link } from "react-router";
import { RowStatusPill } from "~/components/admin/StatusPill";
import { t, type TranslationKey } from "~/i18n";
import { TITLE_MAX_LENGTH } from "~/schemas/admin-content";

export type TreeField = "title" | "passingScore";

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

/** A compact input with its own hidden label and inline error, for tree rows. */
function TreeInput({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: TranslationKey;
  className: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="visually-hidden">{label}</span>
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {t(error)}
        </span>
      ) : null}
    </label>
  );
}

export interface TreeLesson {
  id: number;
  title: string;
  sortOrder: number;
  passingScore: number | null;
  publishedAt: Date | string | null;
  hasDraft: boolean;
}

export interface TreeSection {
  id: number;
  title: string;
  sortOrder: number;
  publishedAt: Date | string | null;
  lessons: TreeLesson[];
}

/** Native confirm keeps delete one click away but never accidental. */
function confirmOrCancel(message: string) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(message)) event.preventDefault();
  };
}

function IconButton({
  intent,
  label,
  icon,
  disabled,
  danger,
  confirm,
}: {
  intent: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  confirm?: string;
}) {
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      className={`icon-btn${danger ? " icon-btn--danger" : ""}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={confirm ? confirmOrCancel(confirm) : undefined}
    >
      {icon}
    </button>
  );
}

function LessonRow({
  lesson,
  isFirst,
  isLast,
  direction,
  errors,
}: {
  lesson: TreeLesson;
  isFirst: boolean;
  isLast: boolean;
  direction: "rtl" | "ltr";
  errors: RowErrors;
}) {
  return (
    <li className="tree-lesson">
      <Form method="post" className="tree-lesson__form" noValidate>
        <input type="hidden" name="lessonId" value={lesson.id} />
        <TreeInput
          label={t("admin.lessons.titleLabel")}
          error={errors.title}
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            defaultValue={lesson.title}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={errors.title ? true : undefined}
          />
        </TreeInput>
        <TreeInput
          label={t("admin.lessons.passingScore")}
          error={errors.passingScore}
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
            aria-invalid={errors.passingScore ? true : undefined}
          />
        </TreeInput>
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
          <IconButton
            intent="move-lesson-up"
            label={t("admin.lessons.moveUp")}
            icon={<ArrowUp size={16} aria-hidden="true" />}
            disabled={isFirst}
          />
          <IconButton
            intent="move-lesson-down"
            label={t("admin.lessons.moveDown")}
            icon={<ArrowDown size={16} aria-hidden="true" />}
            disabled={isLast}
          />
          <IconButton
            intent="delete-lesson"
            label={t("admin.lessons.delete")}
            icon={<Trash2 size={16} aria-hidden="true" />}
            danger
            confirm={t("admin.lessons.deleteConfirm")}
          />
        </span>
      </Form>
    </li>
  );
}

function SectionCard({
  section,
  isFirst,
  isLast,
  direction,
  errors,
}: {
  section: TreeSection;
  isFirst: boolean;
  isLast: boolean;
  direction: "rtl" | "ltr";
  errors: TreeActionResult | undefined;
}) {
  const row = { sectionId: section.id };
  const renameErrors = errorsFor(errors, "update-section", row);
  const addErrors = errorsFor(errors, "create-lesson", row);
  return (
    <li className="card tree-section">
      <Form method="post" className="tree-section__head" noValidate>
        <input type="hidden" name="sectionId" value={section.id} />
        <TreeInput
          label={t("admin.lessons.titleLabel")}
          error={renameErrors.title}
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact tree-section__title"
            name="title"
            dir={direction}
            defaultValue={section.title}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={renameErrors.title ? true : undefined}
          />
        </TreeInput>
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
          <IconButton
            intent="move-section-up"
            label={t("admin.sections.moveUp")}
            icon={<ArrowUp size={16} aria-hidden="true" />}
            disabled={isFirst}
          />
          <IconButton
            intent="move-section-down"
            label={t("admin.sections.moveDown")}
            icon={<ArrowDown size={16} aria-hidden="true" />}
            disabled={isLast}
          />
          <IconButton
            intent="delete-section"
            label={t("admin.sections.delete")}
            icon={<Trash2 size={16} aria-hidden="true" />}
            danger
            confirm={t("admin.sections.deleteConfirm")}
          />
        </span>
      </Form>

      {section.lessons.length === 0 ? (
        <p className="muted tree-empty">{t("admin.lessons.empty")}</p>
      ) : (
        <ol className="tree-lessons">
          {section.lessons.map((lesson, index) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              isFirst={index === 0}
              isLast={index === section.lessons.length - 1}
              direction={direction}
              errors={errorsFor(errors, "update-lesson", { lessonId: lesson.id })}
            />
          ))}
        </ol>
      )}

      <Form method="post" className="tree-add" noValidate>
        <input type="hidden" name="intent" value="create-lesson" />
        <input type="hidden" name="sectionId" value={section.id} />
        <TreeInput
          label={t("admin.lessons.newTitle")}
          error={addErrors.title}
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            placeholder={t("admin.lessons.newTitle")}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={addErrors.title ? true : undefined}
          />
        </TreeInput>
        <button type="submit" className="btn btn--ghost btn--small">
          <Plus size={16} aria-hidden="true" />
          {t("admin.lessons.add")}
        </button>
      </Form>
    </li>
  );
}

/** Sections and lessons of one subject with inline rename, reorder, delete, and add forms. */
export function StructureTree({
  sections,
  direction,
  errors,
}: {
  sections: TreeSection[];
  direction: "rtl" | "ltr";
  /** Validation result of the last inline submit, shown only on the form it came from. */
  errors?: TreeActionResult;
}) {
  const addErrors = errorsFor(errors, "create-section");
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
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              direction={direction}
              errors={errors}
            />
          ))}
        </ol>
      )}

      <Form method="post" className="tree-add tree-add--section" noValidate>
        <input type="hidden" name="intent" value="create-section" />
        <TreeInput
          label={t("admin.sections.newTitle")}
          error={addErrors.title}
          className="tree-field tree-field--grow"
        >
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            placeholder={t("admin.sections.newTitle")}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={addErrors.title ? true : undefined}
          />
        </TreeInput>
        <button type="submit" className="btn btn--primary btn--small">
          <Plus size={16} aria-hidden="true" />
          {t("admin.sections.add")}
        </button>
      </Form>
    </section>
  );
}
