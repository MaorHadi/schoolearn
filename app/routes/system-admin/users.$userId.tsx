import { Ban, CircleCheck, LockOpen, ShieldOff } from "lucide-react";
import { Form, Link, data } from "react-router";
import type { Route } from "./+types/users.$userId";
import { UserStatusPill } from "~/components/admin/UserStatusPill";
import { ConfirmSubmit } from "~/components/forms/ConfirmSubmit";
import { t, type TranslationKey } from "~/i18n";
import { DateRangeFields } from "~/components/forms/DateRangeFields";
import { DateRangeQuerySchema } from "~/schemas/date-range";
import { UserPageIntentSchema } from "~/schemas/user-admin";
import { resolveDateRange } from "~/shared/date-range";
import { requireRole } from "~/server/auth/context.server";
import { clearIpBlock } from "~/server/auth/ip-block.server";
import { flashFromContext } from "~/server/flash.server";
import {
  clearUserLockout,
  getUserForAdmin,
  setUserDisabled,
  setUserRole,
  type UserChangeResult,
} from "~/server/users/user.server";
import { ROLES } from "~/shared/roles";

interface ActionResult {
  formError: TranslationKey;
}

/** How far back the login log reaches when no dates are chosen. */
const DEFAULT_LOG_DAYS = 7;

function parseUserId(raw: string | undefined): number {
  const userId = Number(raw);
  if (!Number.isInteger(userId) || userId <= 0) throw data(t("error.notFound"), { status: 404 });
  return userId;
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const actor = requireRole(context, "SYSTEM_ADMIN");
  const rangeParsed = DateRangeQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const range = resolveDateRange(rangeParsed.success ? rangeParsed.data : {}, DEFAULT_LOG_DAYS);
  const user = await getUserForAdmin(parseUserId(params.userId), {
    since: range.since,
    until: range.until,
  });
  if (!user) throw data(t("error.notFound"), { status: 404 });
  return { user, isSelf: user.id === actor.id, range: { from: range.from, to: range.to } };
}

const CHANGE_ERRORS: Record<Exclude<UserChangeResult, { ok: true }>["reason"], TranslationKey> = {
  NOT_FOUND: "error.notFound",
  SELF: "systemAdmin.error.self",
  LAST_SYSTEM_ADMIN: "systemAdmin.error.lastSystemAdmin",
};

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireRole(context, "SYSTEM_ADMIN");
  const userId = parseUserId(params.userId);
  const parsed = UserPageIntentSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) throw data(t("error.generic"), { status: 400 });
  const input = parsed.data;

  const finish = async (result: UserChangeResult, toast: TranslationKey) => {
    if (!result.ok) {
      return data<ActionResult>({ formError: CHANGE_ERRORS[result.reason] }, { status: 400 });
    }
    await flashFromContext(context, "success", toast);
    return null;
  };

  switch (input.intent) {
    case "set-role":
      return finish(await setUserRole(actor.id, userId, input.role), "toast.userRoleUpdated");
    case "set-disabled":
      return finish(
        await setUserDisabled(actor.id, userId, input.disabled),
        input.disabled ? "toast.userDisabled" : "toast.userEnabled",
      );
    case "clear-lockout": {
      if (!(await clearUserLockout(userId))) throw data(t("error.notFound"), { status: 404 });
      await flashFromContext(context, "success", "toast.lockoutCleared");
      return null;
    }
    case "clear-ip-block": {
      await clearIpBlock(input.ipAddress);
      await flashFromContext(context, "success", "toast.ipBlockCleared");
      return null;
    }
  }
}

// Fixed zone so server and client render the same text (no hydration mismatch).
const dateTimeFormat = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jerusalem",
});

function formatDate(value: Date | string): string {
  return dateTimeFormat.format(new Date(value));
}

/** Logged failure codes are internal; the page shows them in words. Unknown codes fall back. */
const FAILURE_REASON_KEYS: Record<string, TranslationKey | undefined> = {
  USER_NOT_FOUND: "systemAdmin.user.log.reason.USER_NOT_FOUND",
  BAD_PASSWORD: "systemAdmin.user.log.reason.BAD_PASSWORD",
  USER_DISABLED: "systemAdmin.user.log.reason.USER_DISABLED",
  USERNAME_LOCKED: "systemAdmin.user.log.reason.USERNAME_LOCKED",
  IP_BLOCKED: "systemAdmin.user.log.reason.IP_BLOCKED",
  DUPLICATE: "systemAdmin.user.log.reason.DUPLICATE",
  REGISTER_THROTTLED: "systemAdmin.user.log.reason.REGISTER_THROTTLED",
};

export default function SystemAdminUser({ loaderData, actionData }: Route.ComponentProps) {
  const { user, isSelf, range } = loaderData;
  const lockout = user.lockout;
  const outcomeOf = (entry: (typeof user.authLogs)[number]) => {
    if (entry.isSuccessful) return t(`systemAdmin.user.log.${entry.type}.ok`);
    const reasonKey = entry.failureReason ? FAILURE_REASON_KEYS[entry.failureReason] : undefined;
    return t(reasonKey ?? "systemAdmin.user.log.failed");
  };

  return (
    <main className="container page">
      <p className="page__back page__back--top">
        <Link to="/system-admin/users">{t("systemAdmin.user.backToList")}</Link>
      </p>
      <header className="page__head">
        <h1 className="page__title">
          <span className="ltr-value">{user.username}</span>
        </h1>
        <p className="page__lead">
          {user.email ? (
            <span className="ltr-value">{user.email}</span>
          ) : (
            t("systemAdmin.user.noEmail")
          )}
        </p>
        <UserStatusPill role={user.role} isDisabled={user.isDisabled} isLocked={lockout.locked} />
        <p className="muted">
          {t("systemAdmin.user.createdAt").replace("{date}", formatDate(user.createdAt))}
        </p>
      </header>

      {actionData?.formError ? (
        <p className="alert" role="alert">
          {t(actionData.formError)}
        </p>
      ) : null}
      {isSelf ? <p className="muted">{t("systemAdmin.user.selfNote")}</p> : null}

      <div className="admin-columns">
        <section className="card admin-columns__side" aria-labelledby="user-account">
          <h2 id="user-account" className="section-title">
            {t("systemAdmin.user.account")}
          </h2>
          <Form method="post" className="form admin-form" noValidate>
            <input type="hidden" name="intent" value="set-role" />
            <label className="field">
              <span className="field__label">{t("systemAdmin.user.role")}</span>
              <select
                className="field__input select"
                name="role"
                defaultValue={user.role}
                disabled={isSelf}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(`systemAdmin.users.role.${role}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn--primary" disabled={isSelf}>
              {t("systemAdmin.user.saveRole")}
            </button>
          </Form>

          <div className="danger-zone">
            {user.isDisabled ? (
              <Form method="post">
                <input type="hidden" name="intent" value="set-disabled" />
                <input type="hidden" name="disabled" value="false" />
                <button type="submit" className="btn btn--ghost" disabled={isSelf}>
                  <CircleCheck size={16} aria-hidden="true" />
                  {t("systemAdmin.user.enable")}
                </button>
              </Form>
            ) : (
              <ConfirmSubmit
                trigger={
                  <button type="button" className="btn btn--danger" disabled={isSelf}>
                    <Ban size={16} aria-hidden="true" />
                    {t("systemAdmin.user.disable")}
                  </button>
                }
                title={t("systemAdmin.user.disable")}
                description={t("systemAdmin.user.disableConfirm")}
                confirmLabel={t("systemAdmin.user.disable")}
                fields={{ intent: "set-disabled", disabled: "true" }}
                variant="destructive"
              />
            )}
          </div>
        </section>

        <div className="admin-columns__main">
          <section className="card" aria-labelledby="user-security">
            <h2 id="user-security" className="section-title">
              {t("systemAdmin.user.security")}
            </h2>
            <p>
              {lockout.locked && lockout.until
                ? t("systemAdmin.user.lockedUntil").replace("{date}", formatDate(lockout.until))
                : t("systemAdmin.user.notLocked").replace("{count}", String(lockout.failures))}
            </p>
            {lockout.locked ? (
              <Form method="post">
                <input type="hidden" name="intent" value="clear-lockout" />
                <button type="submit" className="btn btn--ghost btn--small">
                  <LockOpen size={16} aria-hidden="true" />
                  {t("systemAdmin.user.clearLockout")}
                </button>
              </Form>
            ) : null}

            {user.ipBlocks.length > 0 ? (
              <ul className="ip-block-list">
                {user.ipBlocks.map((block) => (
                  <li key={block.ipAddress} className="ip-block">
                    <span className="admin-table__mono ltr-value">{block.ipAddress}</span>
                    <span className="muted">
                      {t("systemAdmin.user.blockedUntil").replace(
                        "{date}",
                        formatDate(block.expiresAt),
                      )}
                    </span>
                    <Form method="post">
                      <input type="hidden" name="intent" value="clear-ip-block" />
                      <input type="hidden" name="ipAddress" value={block.ipAddress} />
                      <button type="submit" className="btn btn--ghost btn--small">
                        <ShieldOff size={16} aria-hidden="true" />
                        {t("systemAdmin.user.clearIpBlock")}
                      </button>
                    </Form>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="card" aria-labelledby="user-auth-log">
            <h2 id="user-auth-log" className="section-title">
              {t("systemAdmin.user.authLog")}
            </h2>
            <Form method="get" className="search-form">
              <DateRangeFields defaultFrom={range.from} defaultTo={range.to} />
              <button type="submit" className="btn btn--ghost btn--small">
                {t("systemAdmin.user.applyRange")}
              </button>
            </Form>
            {user.authLogs.length === 0 ? (
              <p className="muted">{t("systemAdmin.user.authLogEmpty")}</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{t("systemAdmin.user.when")}</th>
                    <th scope="col">{t("systemAdmin.user.ip")}</th>
                    <th scope="col">{t("systemAdmin.user.outcome")}</th>
                  </tr>
                </thead>
                <tbody>
                  {user.authLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td className="admin-table__mono">
                        <span className="ltr-value">{entry.ipAddress}</span>
                      </td>
                      <td>{outcomeOf(entry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
