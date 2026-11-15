import { LessonTabs } from "~/components/admin/LessonTabs";
import { RowStatusPill } from "~/components/admin/StatusPill";
import { PageHeader } from "~/components/PageHeader";
import { t, type TranslationKey } from "~/i18n";
import type { TextDirection } from "~/shared/direction";

/**
 * Header shared by the two editors of a lesson (content and questions): the way back to the
 * subject, the lesson and section titles, its publish state, what saving means, a warning when
 * the stored draft is unusable, and the tabs between the editors.
 */
export function LessonEditorHeader({
  lesson,
  sectionTitle,
  subject,
  lead,
  draftInvalidMessage,
}: {
  lesson: {
    id: number;
    title: string;
    publishedAt: Date | string | null;
    hasDraft: boolean;
    draftInvalid: boolean;
  };
  sectionTitle: string;
  subject: { id: number; name: string; direction: TextDirection };
  lead: TranslationKey;
  draftInvalidMessage: TranslationKey;
}) {
  return (
    <PageHeader
      back={{
        to: `/admin/subjects/${subject.id}`,
        label: t("admin.lesson.backToSubject", { subject: subject.name }),
      }}
      title={lesson.title}
      lead={sectionTitle}
      dir={subject.direction}
      leadDir={subject.direction}
    >
      <RowStatusPill publishedAt={lesson.publishedAt} hasDraft={lesson.hasDraft} />
      <p className="muted">{t(lead)}</p>
      {lesson.draftInvalid ? (
        <p className="alert" role="alert">
          {t(draftInvalidMessage)}
        </p>
      ) : null}
      <LessonTabs lessonId={lesson.id} />
    </PageHeader>
  );
}
