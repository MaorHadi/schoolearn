import { Form, Link, data, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { AuthPage, Field } from "~/components/AuthPage";
import { t } from "~/i18n";
import { LoginSchema } from "~/schemas/auth";
import { getClientIp } from "~/server/auth/client-ip.server";
import { login } from "~/server/auth/login.server";
import { replaceSession } from "~/server/auth/session.server";
import { setFlash } from "~/server/flash.server";
import { safeRedirect } from "~/shared/safe-redirect";

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = LoginSchema.safeParse(form);
  if (!parsed.success) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const clientIp = getClientIp(request);
  const result = await login(parsed.data, clientIp);
  if (!result.ok) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const { id: sessionId, cookie } = await replaceSession(request, result.userId, clientIp);
  await setFlash(sessionId, "info", "toast.welcomeBack", { username: parsed.data.username });
  const target = safeRedirect(new URL(request.url).searchParams.get("redirectTo"), request.url);
  return redirect(target, { headers: { "Set-Cookie": cookie } });
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <AuthPage title={t("auth.login")} lead={t("auth.loginLead")}>
      <Form method="post" className="form" noValidate>
        <Field label={t("auth.username")}>
          <input
            className="field__input"
            name="username"
            autoComplete="username"
            required
            autoFocus
          />
        </Field>
        <Field label={t("auth.password")}>
          <input
            className="field__input"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {actionData?.error ? (
          <p className="alert" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? t("auth.loggingIn") : t("auth.login")}
        </button>
      </Form>
      <p className="auth__switch">
        {t("auth.noAccount")} <Link to="/register">{t("auth.register")}</Link>
      </p>
    </AuthPage>
  );
}
