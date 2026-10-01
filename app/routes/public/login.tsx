import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/login";
import { t } from "~/i18n";
import { LoginSchema } from "~/lib/auth/validation";
import { login } from "~/lib/auth/login.server";
import { createSession } from "~/lib/auth/session.server";
import { getClientIp } from "~/lib/auth/client-ip.server";

/** Only allow same-origin relative paths as a post-login destination. */
function safeRedirect(to: string | null): string {
  return to && to.startsWith("/") && !to.startsWith("//") ? to : "/subjects";
}

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = LoginSchema.safeParse(form);
  if (!parsed.success) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const result = await login(parsed.data, getClientIp(request));
  if (!result.ok) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const { cookie } = await createSession(result.userId, getClientIp(request));
  const to = safeRedirect(new URL(request.url).searchParams.get("redirectTo"));
  return redirect(to, { headers: { "Set-Cookie": cookie } });
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
