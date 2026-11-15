import { he, type TranslationKey } from "./he";

/**
 * Minimal translation layer. Single language for now.
 * To add a language: create a sibling file (e.g. en.ts) with the same keys and switch here.
 *
 * `values` fills the `{name}` placeholders of the string: `t("lesson.position", { index, total })`.
 */
export function t(key: TranslationKey, values?: Record<string, string | number>): string {
  let text: string = he[key];
  for (const [name, value] of Object.entries(values ?? {})) {
    text = text.replace(`{${name}}`, String(value));
  }
  return text;
}

export type { TranslationKey };
