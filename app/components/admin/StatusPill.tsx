import { t } from "~/i18n";

/**
 * Publish state of a subject row: published or not, plus a "pending" marker when publishing
 * would change something for learners.
 */
export function SubjectStatusPill({
  isActive,
  hasPendingChanges,
}: {
  isActive: boolean;
  hasPendingChanges: boolean;
}) {
  return (
    <span className="status-pills">
      <span className={`status-pill status-pill--${isActive ? "published" : "unpublished"}`}>
        {isActive ? t("admin.status.published") : t("admin.status.unpublished")}
      </span>
      {isActive && hasPendingChanges ? (
        <span className="status-pill status-pill--pending" title={t("admin.status.pending")}>
          {t("admin.status.pending")}
        </span>
      ) : null}
    </span>
  );
}

/** A section or lesson row: published, or still only in the editor; lessons may also hold a draft. */
export function RowStatusPill({
  publishedAt,
  hasDraft = false,
}: {
  publishedAt: Date | string | null;
  hasDraft?: boolean;
}) {
  if (publishedAt === null) {
    return (
      <span className="status-pill status-pill--unpublished">{t("admin.status.unpublished")}</span>
    );
  }
  if (hasDraft) {
    return <span className="status-pill status-pill--draft">{t("admin.status.draft")}</span>;
  }
  return null;
}
