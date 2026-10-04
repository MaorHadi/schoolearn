import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/login";
import { t } from "~/i18n";
import { LoginSchema } from "~/schemas/auth";
import { login } from "~/server/auth/login.server";
import { replaceSession } from "~/server/auth/session.server";
import { getClientIp } from "~/server/auth/client-ip.server";
import { safeRedirect } from "~/shared/safe-redirect";

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = LoginSchema.safeParse(form);
  if (!parsed.success) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const clientIp = getClientIp(request);
  const result = await login(parsed.data, clientIp);
  if (!result.ok) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const { cookie } = await replaceSession(request, result.userId, clientIp);
  const target = safeRedirect(new URL(request.url).searchParams.get("redirectTo"), request.url);
  return redirect(target, { headers: { "Set-Cookie": cookie } });
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>{t("auth.login")}</h1>
      <Form method="post" className="form">
        <label>
          {t("auth.username")}
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          {t("auth.password")}
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">{t("auth.login")}</button>
      </Form>
      <p>
        {t("auth.noAccount")} <Link to="/register">{t("auth.register")}</Link>
      </p>
    </main>
  );
}
