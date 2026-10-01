// Shared (client-safe).
export type TextDirection = "rtl" | "ltr";

/** Content direction comes from the subject; a block may override it. */
export function resolveDirection(
  subjectDir: TextDirection,
  blockDir?: TextDirection,
): TextDirection {
  return blockDir ?? subjectDir;
}
