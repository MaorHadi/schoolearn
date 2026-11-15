import { t } from "~/i18n";

/**
 * Lessons completed out of the total, as a bar in the current accent colour. The filled width
 * comes from the `--progress` variable an ancestor sets (the subject card and the subject page
 * also use it for their own decoration).
 */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={t("subjects.progressLabel")}
    >
      <span className="progress__fill" />
    </div>
  );
}
