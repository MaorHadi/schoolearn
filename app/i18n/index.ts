import { he, type TranslationKey } from "./he";

/**
 * Minimal translation layer. Single language for now.
 * To add a language: create a sibling file (e.g. en.ts) with the same keys and switch here.
 */
export function t(key: TranslationKey): string {
  return he[key];
}

export type { TranslationKey };
