import { Form, Link, data, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/register";
import { AuthPage, Field } from "~/components/AuthPage";
import { t } from "~/i18n";
import { RegisterSchema } from "~/schemas/auth";
import { getClientIp } from "~/server/auth/client-ip.server";
import { register } from "~/server/auth/register.server";
import { replaceSession } from "~/server/auth/session.server";
import { getSystemSettings } from "~/server/settings/settings.server";
import { registerFieldErrors, type FieldErrors } from "~/shared/auth-errors";

interface ActionResult {
  fieldErrors?: FieldErrors;
  error?: string;
}

export async function loader() {
  return { registrationOpen: (await getSystemSettings()).registrationOpen };
}

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = RegisterSchema.safeParse(form);
  if (!parsed.success) {
    // Input problems are about the visible rules, so they can be specific per field.
    return data<ActionResult>({ fieldErrors: registerFieldErrors(parsed.error) }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const result = await register(parsed.data, clientIp);
  if (!result.ok && result.reason === "REGISTRATION_CLOSED") {
    return data<ActionResult>({ error: t("auth.registrationClosed") }, { status: 403 });
  }
  if (!result.ok) {
    // Duplicate or throttled: one message, so the form never confirms which names exist.
    return data<ActionResult>({ error: t("auth.registerFailed") }, { status: 400 });
  }

  const { cookie } = await replaceSession(request, result.userId, clientIp);
  return redirect("/subjects?welcome=1", { headers: { "Set-Cookie": cookie } });
}

export default function Register({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const fieldErrors = actionData?.fieldErrors ?? {};
  if (!loaderData.registrationOpen) {
    return (
      <AuthPage title={t("auth.register")} lead={t("auth.registerLead")}>
        <p className="alert" role="status">
          {t("auth.registrationClosed")}
        </p>
        <p className="auth__switch">
          {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
        </p>
      </AuthPage>
    );
  }
  return (
    <AuthPage title={t("auth.register")} lead={t("auth.registerLead")}>
      <Form method="post" className="form" noValidate>
        <Field
          label={t("auth.username")}
          error={fieldErrors.username ? t(fieldErrors.username) : undefined}
        >
          <input
            className="field__input"
            name="username"
            autoComplete="username"
            required
            autoFocus
            aria-invalid={fieldErrors.username ? true : undefined}
          />
        </Field>
        <Field label={t("auth.email")} error={fieldErrors.email ? t(fieldErrors.email) : undefined}>
          <input
            className="field__input"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={fieldErrors.email ? true : undefined}
          />
        </Field>
        <Field
          label={t("auth.password")}
          error={fieldErrors.password ? t(fieldErrors.password) : undefined}
        >
          <input
            className="field__input"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={fieldErrors.password ? true : undefined}
          />
        </Field>
        {actionData?.error ? (
          <p className="alert" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? t("auth.registering") : t("auth.register")}
        </button>
      </Form>
      <p className="auth__switch">
        {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
      </p>
    </AuthPage>
  );
}
