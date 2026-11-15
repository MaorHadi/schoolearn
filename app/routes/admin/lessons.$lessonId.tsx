import type { CSSProperties } from "react";
import { data } from "react-router";
import type { Route } from "./+types/lessons.$lessonId";
import { LessonEditorHeader } from "~/components/admin/LessonEditorHeader";
import { BlockEditor } from "~/components/content-editor/BlockEditor";
import {
  SAVE_DRAFT_INTENT,
  UPLOAD_INTENT,
  type UploadFetcherResult,
} from "~/components/content-editor/blocks";
import { t } from "~/i18n";
import { BlocksFormSchema } from "~/schemas/admin-content";
import { requireRole } from "~/server/auth/context.server";
import { getLessonForAdmin, saveLessonDraft } from "~/server/content/admin.server";
import { flashFromContext } from "~/server/flash.server";
import { notFound, parseIdParam } from "~/server/route-params.server";
import { getSystemSettings } from "~/server/settings/settings.server";
import { storeUploadedImage } from "~/server/storage/upload.server";
import type { FormError } from "~/shared/field-errors";
import { resolveSubjectTheme } from "~/shared/subject-theme";

/** Room for the multipart boundary and field headers around the largest allowed file. */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/** An upload answers its card's fetcher; a refused save answers with a form error. */
type LessonActionResult = UploadFetcherResult | FormError;

/** True when a multipart body announces more bytes than any accepted upload could need. */
async function multipartTooLarge(request: Request): Promise<boolean> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) return false;
  const declared = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declared)) return false;
  const { uploadMaxBytes } = await getSystemSettings();
  return declared > uploadMaxBytes + MULTIPART_OVERHEAD_BYTES;
}

export async function loader({ context, params }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  const lesson = await getLessonForAdmin(parseIdParam(params.lessonId));
  if (!lesson) throw notFound();
  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      publishedAt: lesson.publishedAt,
      hasDraft: lesson.hasDraft,
      draftInvalid: lesson.draftInvalid,
      blocks: lesson.blocks,
      assetUrls: lesson.assetUrls,
    },
    sectionTitle: lesson.section.title,
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
 * Validation failures come back as `formError` so the editor keeps its unsaved state.
 * "upload": store one image and answer the card's fetcher with the new asset id and URL. The
 * declared body size is checked before the multipart body is parsed into memory.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  const user = requireRole(context, "ADMIN");
  const lessonId = parseIdParam(params.lessonId);

  if (await multipartTooLarge(request)) {
    // The block id lives inside the unparsed body; the per-card fetcher still knows its owner.
    return data<LessonActionResult>(
      { ok: false, blockId: "", reason: "TOO_LARGE" },
      { status: 413 },
    );
  }

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
      return data<LessonActionResult>(
        { ok: false, blockId, reason: result.reason },
        { status: 400 },
      );
    }
    return data<LessonActionResult>({
      ok: true,
      blockId,
      assetId: result.assetId,
      url: result.url,
    });
  }

  if (intent !== SAVE_DRAFT_INTENT) throw data(t("error.generic"), { status: 400 });
  const parsed = BlocksFormSchema.safeParse({ blocks: form.get("blocks") });
  if (!parsed.success) {
    return data<LessonActionResult>({ formError: "admin.error.blocks" }, { status: 400 });
  }

  const saved = await saveLessonDraft(lessonId, parsed.data.blocks);
  if (!saved.ok && saved.reason === "NOT_FOUND") throw notFound();
  if (!saved.ok) {
    return data<LessonActionResult>({ formError: "admin.error.unknownAsset" }, { status: 400 });
  }
  await flashFromContext(context, "success", "toast.draftSaved");
  return null;
}

export default function EditLesson({ loaderData, actionData }: Route.ComponentProps) {
  const { lesson, sectionTitle, subject } = loaderData;
  const style = { "--accent": subject.theme.accentColor } as CSSProperties;
  const formError = actionData && "formError" in actionData ? actionData.formError : undefined;

  return (
    <main className="container page" style={style}>
      <LessonEditorHeader
        lesson={lesson}
        sectionTitle={sectionTitle}
        subject={subject}
        lead="admin.lesson.draftLead"
        draftInvalidMessage="admin.lesson.draftInvalid"
      />

      {/* Keyed on the lesson so navigating between lessons resets the editor state. */}
      <BlockEditor
        key={lesson.id}
        initialBlocks={lesson.blocks}
        direction={subject.direction}
        initialAssetUrls={lesson.assetUrls}
        formError={formError}
      />
    </main>
  );
}
