import { t } from "~/i18n";
import type { Role } from "~/shared/roles";

/** Role, plus "disabled" and "locked" markers when they apply. */
export function UserStatusPill({
  role,
  isDisabled,
  isLocked = false,
}: {
  role: Role;
  isDisabled: boolean;
  isLocked?: boolean;
}) {
  return (
    <span className="status-pills">
      <span className={`status-pill status-pill--role-${role.toLowerCase()}`}>
        {t(`systemAdmin.users.role.${role}`)}
      </span>
      {isDisabled ? (
        <span className="status-pill status-pill--danger">{t("systemAdmin.users.disabled")}</span>
      ) : null}
      {isLocked ? (
        <span className="status-pill status-pill--pending">{t("systemAdmin.users.locked")}</span>
      ) : null}
    </span>
  );
}
