import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/register";
import { t } from "~/i18n";
import { RegisterSchema } from "~/lib/auth/validation";
import { registerUser } from "~/lib/auth/register.server";
import { createSession } from "~/lib/auth/session.server";
import { getClientIp } from "~/lib/auth/client-ip.server";

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = RegisterSchema.safeParse(form);
  if (!parsed.success) return data({ error: t("auth.registerFailed") }, { status: 400 });

  const result = await registerUser(parsed.data);
  if (!result.ok) return data({ error: t("auth.registerFailed") }, { status: 400 });

  const { cookie } = await createSession(result.userId, getClientIp(request));
  return redirect("/subjects", { headers: { "Set-Cookie": cookie } });
}

export default function Register({ actionData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>{t("auth.register")}</h1>
      <p>{t("auth.registerRules")}</p>
      <Form method="post" className="form">
        <label>
          {t("auth.username")}
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          {t("auth.email")}
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          {t("auth.password")}
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">{t("auth.register")}</button>
      </Form>
      <p>
        {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
      </p>
    </main>
  );
}
