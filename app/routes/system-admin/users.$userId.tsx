import { Ban, CircleCheck, LockOpen, ShieldOff } from "lucide-react";
import { Form, data } from "react-router";
import type { Route } from "./+types/users.$userId";
import { UserStatusPill } from "~/components/admin/UserStatusPill";
import { ConfirmSubmit } from "~/components/forms/ConfirmSubmit";
import { DateRangeFields } from "~/components/forms/DateRangeFields";
import { Field } from "~/components/forms/Field";
import { PageHeader } from "~/components/PageHeader";
import { t, type TranslationKey } from "~/i18n";
import { DateRangeQuerySchema } from "~/schemas/date-range";
import { UserPageIntentSchema } from "~/schemas/user-admin";
import { resolveDateRange } from "~/shared/date-range";
import { requireRole } from "~/server/auth/context.server";
import { clearIpBlock } from "~/server/auth/ip-block.server";
import { flashFromContext } from "~/server/flash.server";
import { notFound, parseIdParam } from "~/server/route-params.server";
import {
  clearUserLockout,
  getUserForAdmin,
  setUserDisabled,
  setUserRole,
  type UserChangeResult,
} from "~/server/users/user.server";
import type { FormError } from "~/shared/field-errors";
import { formatDateTime } from "~/shared/format-date";
import { ROLES } from "~/shared/roles";

/** How far back the login log reaches when no dates are chosen. */
const DEFAULT_LOG_DAYS = 7;

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const actor = requireRole(context, "SYSTEM_ADMIN");
  const rangeParsed = DateRangeQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  const range = resolveDateRange(rangeParsed.success ? rangeParsed.data : {}, DEFAULT_LOG_DAYS);
  const user = await getUserForAdmin(parseIdParam(params.userId), {
    since: range.since,
    until: range.until,
  });
  if (!user) throw notFound();
  return { user, isSelf: user.id === actor.id, range: { from: range.from, to: range.to } };
}

const CHANGE_ERRORS: Record<Exclude<UserChangeResult, { ok: true }>["reason"], TranslationKey> = {
  NOT_FOUND: "error.notFound",
  SELF: "systemAdmin.error.self",
  LAST_SYSTEM_ADMIN: "systemAdmin.error.lastSystemAdmin",
};

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireRole(context, "SYSTEM_ADMIN");
  const userId = parseIdParam(params.userId);
  const parsed = UserPageIntentSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) throw data(t("error.generic"), { status: 400 });
  const input = parsed.data;

  const finish = async (result: UserChangeResult, toast: TranslationKey) => {
    if (!result.ok) {
      return data<FormError>({ formError: CHANGE_ERRORS[result.reason] }, { status: 400 });
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
      if (!(await clearUserLockout(userId))) throw notFound();
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
      <PageHeader
        back={{ to: "/system-admin/users", label: t("systemAdmin.user.backToList") }}
        title={<span className="ltr-value">{user.username}</span>}
        lead={
          user.email ? (
            <span className="ltr-value">{user.email}</span>
          ) : (
            t("systemAdmin.user.noEmail")
          )
        }
      >
        <UserStatusPill role={user.role} isDisabled={user.isDisabled} isLocked={lockout.locked} />
        <p className="muted">
          {t("systemAdmin.user.createdAt", { date: formatDateTime(user.createdAt) })}
        </p>
      </PageHeader>

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
            <Field label={t("systemAdmin.user.role")}>
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
            </Field>
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
                ? t("systemAdmin.user.lockedUntil", { date: formatDateTime(lockout.until) })
                : t("systemAdmin.user.notLocked", { count: lockout.failures })}
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
                      {t("systemAdmin.user.blockedUntil", {
                        date: formatDateTime(block.expiresAt),
                      })}
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
                      <td>{formatDateTime(entry.createdAt)}</td>
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
