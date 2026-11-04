import { ArrowDown, ArrowUp, PencilLine, Plus, Trash2 } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Form, Link } from "react-router";
import { RowStatusPill } from "~/components/admin/StatusPill";
import { t } from "~/i18n";
import { TITLE_MAX_LENGTH } from "~/schemas/admin-content";

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
}: {
  lesson: TreeLesson;
  isFirst: boolean;
  isLast: boolean;
  direction: "rtl" | "ltr";
}) {
  return (
    <li className="tree-lesson">
      <Form method="post" className="tree-lesson__form">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <label className="tree-field tree-field--grow">
          <span className="visually-hidden">{t("admin.lessons.titleLabel")}</span>
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            defaultValue={lesson.title}
            maxLength={TITLE_MAX_LENGTH}
            required
          />
        </label>
        <label className="tree-field tree-field--score">
          <span className="visually-hidden">{t("admin.lessons.passingScore")}</span>
          <input
            className="field__input field__input--compact"
            name="passingScore"
            type="number"
            min={0}
            max={100}
            placeholder="%"
            title={t("admin.lessons.passingScore")}
            defaultValue={lesson.passingScore ?? ""}
          />
        </label>
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
}: {
  section: TreeSection;
  isFirst: boolean;
  isLast: boolean;
  direction: "rtl" | "ltr";
}) {
  return (
    <li className="card tree-section">
      <Form method="post" className="tree-section__head">
        <input type="hidden" name="sectionId" value={section.id} />
        <label className="tree-field tree-field--grow">
          <span className="visually-hidden">{t("admin.lessons.titleLabel")}</span>
          <input
            className="field__input field__input--compact tree-section__title"
            name="title"
            dir={direction}
            defaultValue={section.title}
            maxLength={TITLE_MAX_LENGTH}
            required
          />
        </label>
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
            />
          ))}
        </ol>
      )}

      <Form method="post" className="tree-add">
        <input type="hidden" name="intent" value="create-lesson" />
        <input type="hidden" name="sectionId" value={section.id} />
        <label className="tree-field tree-field--grow">
          <span className="visually-hidden">{t("admin.lessons.newTitle")}</span>
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            placeholder={t("admin.lessons.newTitle")}
            maxLength={TITLE_MAX_LENGTH}
            required
          />
        </label>
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
}: {
  sections: TreeSection[];
  direction: "rtl" | "ltr";
}) {
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
            />
          ))}
        </ol>
      )}

      <Form method="post" className="tree-add tree-add--section">
        <input type="hidden" name="intent" value="create-section" />
        <label className="tree-field tree-field--grow">
          <span className="visually-hidden">{t("admin.sections.newTitle")}</span>
          <input
            className="field__input field__input--compact"
            name="title"
            dir={direction}
            placeholder={t("admin.sections.newTitle")}
            maxLength={TITLE_MAX_LENGTH}
            required
          />
        </label>
        <button type="submit" className="btn btn--primary btn--small">
          <Plus size={16} aria-hidden="true" />
          {t("admin.sections.add")}
        </button>
      </Form>
    </section>
  );
}
