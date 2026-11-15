import { Check, Lock } from "lucide-react";
import { Link } from "react-router";
import { t } from "~/i18n";
import type { TextDirection } from "~/shared/direction";
import { findCurrentLesson, stationState, type StationState } from "~/shared/lesson-path";
import type { LessonState, SectionState } from "~/shared/unlock";

interface LessonPathProps {
  slug: string;
  direction: TextDirection;
  tree: SectionState[];
}

/**
 * The transit line. One continuous rail; each section is a segment lit in the subject accent
 * as far as the student has travelled; each lesson is a station on it.
 */
export function LessonPath({ slug, direction, tree }: LessonPathProps) {
  const current = findCurrentLesson(tree);
  return (
    <ol className="path">
      {tree.map((section) => (
        <PathSection
          key={section.id}
          slug={slug}
          direction={direction}
          section={section}
          currentId={current?.id ?? null}
        />
      ))}
    </ol>
  );
}

function PathSection({
  slug,
  direction,
  section,
  currentId,
}: {
  slug: string;
  direction: TextDirection;
  section: SectionState;
  currentId: number | null;
}) {
  const done = section.lessons.filter((lesson) => lesson.completed).length;
  const total = section.lessons.length;
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <li
      className="path-section"
      data-locked={section.unlocked ? undefined : "true"}
      style={{ "--segment-progress": `${percent}%` } as React.CSSProperties}
    >
      <header className="path-section__head">
        <span className="path-section__marker" aria-hidden="true">
          {section.unlocked ? null : <Lock size={14} />}
        </span>
        <h2 className="path-section__title" dir={direction}>
          {section.title}
        </h2>
        <span className="path-section__count" aria-label={t("subject.sectionProgressLabel")}>
          {done}/{total}
        </span>
      </header>
      {!section.unlocked ? <p className="path-section__hint">{t("subject.lockedHint")}</p> : null}
      <ol className="path-section__lessons">
        {section.lessons.map((lesson) => (
          <Station
            key={lesson.id}
            slug={slug}
            direction={direction}
            lesson={lesson}
            state={stationState(lesson, currentId)}
          />
        ))}
      </ol>
    </li>
  );
}

function Station({
  slug,
  direction,
  lesson,
  state,
}: {
  slug: string;
  direction: TextDirection;
  lesson: LessonState;
  state: StationState;
}) {
  const label =
    state === "completed"
      ? t("subject.completed")
      : state === "current"
        ? t("subject.current")
        : state === "locked"
          ? t("subject.locked")
          : t("subject.available");

  const body = (
    <>
      <span className="station__marker" aria-hidden="true">
        {state === "completed" ? <Check size={16} strokeWidth={3} /> : null}
      </span>
      <span className="station__text">
        <span className="station__title" dir={direction}>
          {lesson.title}
        </span>
        <span className="station__meta">
          {label}
          {lesson.hasQuestions && lesson.bestScore != null
            ? ` · ${t("subject.bestScore")} ${lesson.bestScore}`
            : ""}
        </span>
      </span>
    </>
  );

  return (
    <li className="station" data-state={state}>
      {state === "locked" ? (
        <span className="station__inner">{body}</span>
      ) : (
        <Link
          to={`/subjects/${slug}/lessons/${lesson.id}`}
          className="station__inner"
          aria-current={state === "current" ? "step" : undefined}
        >
          {body}
        </Link>
      )}
    </li>
  );
}
