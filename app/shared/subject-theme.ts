// Shared (client-safe). Per-subject theme is data on the Subject row; this validates it.
import { z } from "zod";

/** Lucide icons a subject may use. Kebab-case names as stored in Subject.icon. */
export const SUBJECT_ICONS = [
  "book-open",
  "scroll",
  "landmark",
  "flask-conical",
  "calculator",
  "globe",
  "languages",
  "music",
  "palette",
  "atom",
  "leaf",
  "scale",
] as const;
export type SubjectIcon = (typeof SUBJECT_ICONS)[number];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const SubjectThemeSchema = z.object({
  accentColor: z.string().regex(HEX_COLOR_RE, "accentColor must be a 6-digit hex color"),
  icon: z.enum(SUBJECT_ICONS),
});
export type SubjectTheme = z.infer<typeof SubjectThemeSchema>;

export const DEFAULT_SUBJECT_THEME: SubjectTheme = { accentColor: "#2563EB", icon: "book-open" };

/** Coerce stored values to a valid theme, falling back per field so bad data never breaks a page. */
export function resolveSubjectTheme(input: { accentColor: string; icon: string }): SubjectTheme {
  return {
    accentColor: HEX_COLOR_RE.test(input.accentColor)
      ? input.accentColor
      : DEFAULT_SUBJECT_THEME.accentColor,
    icon: (SUBJECT_ICONS as readonly string[]).includes(input.icon)
      ? (input.icon as SubjectIcon)
      : DEFAULT_SUBJECT_THEME.icon,
  };
}
