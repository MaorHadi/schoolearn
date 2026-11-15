// Client-safe. Validation for the admin content editor's forms. Every admin action parses
// `Object.fromEntries(formData)` through one of these, so form values are strings here.
import { z } from "zod";
import { Direction, LessonContent as LessonContentSchema } from "~/schemas/content-blocks";
import { jsonField } from "~/schemas/json-field";
import { CONTENT_LOCALES } from "~/shared/content-locales";
import { SubjectThemeSchema } from "~/shared/subject-theme";

const SUBJECT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;

const title = z.string().trim().min(1).max(TITLE_MAX_LENGTH);
const positiveId = z.coerce.number().int().positive();

/** Empty input means "not set". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

/** Empty input means null (use the env default); otherwise a whole percent. */
const optionalPercent = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().int().min(0).max(100).nullable(),
);

export const SubjectInputSchema = SubjectThemeSchema.extend({
  slug: z.string().trim().toLowerCase().min(1).max(64).regex(SUBJECT_SLUG_RE),
  name: title,
  description: optionalText(DESCRIPTION_MAX_LENGTH),
  locale: z.enum(CONTENT_LOCALES),
  direction: Direction,
  /** Passing score for the subject's lessons that set none; empty means the site default. */
  defaultPassingScore: optionalPercent,
});
type SubjectFormInput = z.infer<typeof SubjectInputSchema>;
export type SubjectFormField = keyof SubjectFormInput;

export const LessonInputSchema = z.object({
  title,
  passingScore: optionalPercent,
});

/** Everything the subject edit page can do, keyed by the `intent` field. */
export const SubjectPageIntentSchema = z.discriminatedUnion("intent", [
  SubjectInputSchema.extend({ intent: z.literal("update-subject") }),
  z.object({ intent: z.literal("delete-subject") }),
  z.object({ intent: z.literal("create-section"), title }),
  z.object({ intent: z.literal("update-section"), sectionId: positiveId, title }),
  z.object({ intent: z.literal("delete-section"), sectionId: positiveId }),
  z.object({ intent: z.literal("move-section-up"), sectionId: positiveId }),
  z.object({ intent: z.literal("move-section-down"), sectionId: positiveId }),
  z.object({
    intent: z.literal("reorder-section"),
    sectionId: positiveId,
    targetSectionId: positiveId,
  }),
  LessonInputSchema.extend({ intent: z.literal("create-lesson"), sectionId: positiveId }),
  LessonInputSchema.extend({ intent: z.literal("update-lesson"), lessonId: positiveId }),
  z.object({ intent: z.literal("delete-lesson"), lessonId: positiveId }),
  z.object({ intent: z.literal("move-lesson-up"), lessonId: positiveId }),
  z.object({ intent: z.literal("move-lesson-down"), lessonId: positiveId }),
  z.object({
    intent: z.literal("reorder-lesson"),
    lessonId: positiveId,
    targetLessonId: positiveId,
  }),
]);

/** The block editor posts its state as one JSON string. */
export const BlocksFormSchema = z.object({
  blocks: jsonField(LessonContentSchema, "blocks must be JSON"),
});

/** Checkbox list: one `subjectId` entry per checked subject. */
export const PublishFormSchema = z.object({
  subjectId: z
    .union([positiveId, z.array(positiveId).min(1)])
    .transform((value) => (Array.isArray(value) ? value : [value])),
});
