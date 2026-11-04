import type { CSSProperties } from "react";
import { Link, data } from "react-router";
import type { Route } from "./+types/lessons.$lessonId";
import { RowStatusPill } from "~/components/admin/StatusPill";
import {
  BlockEditor,
  SAVE_DRAFT_INTENT,
  UPLOAD_INTENT,
  type UploadFetcherResult,
} from "~/components/content-editor/BlockEditor";
import { t } from "~/i18n";
import { BlocksFormSchema } from "~/schemas/admin-content";
import { requireRole } from "~/server/auth/context.server";
import { getLessonForAdmin, saveLessonDraft } from "~/server/content/admin.server";
import { flashFromContext } from "~/server/flash.server";
import { storeUploadedImage } from "~/server/storage/upload.server";
import { resolveSubjectTheme } from "~/shared/subject-theme";

function parseLessonId(raw: string | undefined): number {
  const lessonId = Number(raw);
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    throw data(t("error.notFound"), { status: 404 });
  }
  return lessonId;
}

export async function loader({ context, params }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  const lesson = await getLessonForAdmin(parseLessonId(params.lessonId));
  if (!lesson) throw data(t("error.notFound"), { status: 404 });
  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      publishedAt: lesson.publishedAt,
      hasDraft: lesson.hasDraft,
      blocks: lesson.blocks,
      assetUrls: lesson.assetUrls,
    },
    section: { title: lesson.section.title },
    subject: {
      id: lesson.section.subject.id,
      name: lesson.section.subject.name,
      direction: lesson.section.subject.direction,
      theme: resolveSubjectTheme(lesson.section.subject),
    },
  };
}

/**
 * "save-draft": store the block array as the lesson's draft (learners keep seeing `content`).
 * "upload": store one image and answer the card's fetcher with the new asset id and URL.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  const user = requireRole(context, "ADMIN");
  const lessonId = parseLessonId(params.lessonId);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === UPLOAD_INTENT) {
    const blockIdField = form.get("blockId");
    const blockId = typeof blockIdField === "string" ? blockIdField : "";
    const file = form.get("file");
    if (!(file instanceof File) || blockId === "") {
      throw data(t("error.generic"), { status: 400 });
    }
    const result = await storeUploadedImage(file, user.id);
    if (!result.ok) {
      return data<UploadFetcherResult>(
        { ok: false, blockId, reason: result.reason },
        { status: 400 },
      );
    }
    return data<UploadFetcherResult>({
      ok: true,
      blockId,
      assetId: result.assetId,
      url: result.url,
    });
  }

  if (intent !== SAVE_DRAFT_INTENT) throw data(t("error.generic"), { status: 400 });
  const parsed = BlocksFormSchema.safeParse({ blocks: form.get("blocks") });
  if (!parsed.success) throw data(t("admin.error.blocks"), { status: 400 });

  const saved = await saveLessonDraft(lessonId, parsed.data.blocks);
  if (!saved.ok && saved.reason === "NOT_FOUND") throw data(t("error.notFound"), { status: 404 });
  if (!saved.ok) throw data(t("admin.error.unknownAsset"), { status: 400 });
  await flashFromContext(context, "success", "toast.draftSaved");
  return null;
}

export default function EditLesson({ loaderData }: Route.ComponentProps) {
  const { lesson, section, subject } = loaderData;
  const style = { "--accent": subject.theme.accentColor } as CSSProperties;

  return (
    <main className="container page" style={style}>
      <p className="page__back page__back--top">
        <Link to={`/admin/subjects/${subject.id}`}>
          {t("admin.lesson.backToSubject").replace("{subject}", subject.name)}
        </Link>
      </p>
      <header className="page__head">
        <h1 className="page__title" dir={subject.direction}>
          {lesson.title}
        </h1>
        <p className="page__lead" dir={subject.direction}>
          {section.title}
        </p>
        <RowStatusPill publishedAt={lesson.publishedAt} hasDraft={lesson.hasDraft} />
        <p className="muted">{t("admin.lesson.draftLead")}</p>
      </header>

      {/* Keyed on the lesson so navigating between lessons resets the editor state. */}
      <BlockEditor
        key={lesson.id}
        initialBlocks={lesson.blocks}
        direction={subject.direction}
        initialAssetUrls={lesson.assetUrls}
      />
    </main>
  );
}
