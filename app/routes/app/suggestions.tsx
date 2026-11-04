import { Form, Link, data, useNavigation } from "react-router";
import type { Route } from "./+types/suggestions";
import { Field } from "~/components/AuthPage";
import { t } from "~/i18n";
import { SUGGESTION_MAX_LENGTH, SuggestionSchema } from "~/schemas/feedback";
import { requireUser, sessionContext } from "~/server/auth/context.server";
import { createSuggestion } from "~/server/feedback/suggestions.server";
import { setFlash } from "~/server/flash.server";
import { fieldErrorsFrom } from "~/shared/field-errors";
import type { TranslationKey } from "~/i18n";

interface ActionResult {
  fieldErrors?: Partial<Record<"body", TranslationKey>>;
  error?: string;
  sent?: boolean;
}

export function loader({ context }: Route.LoaderArgs) {
  requireUser(context);
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = requireUser(context);
  const form = Object.fromEntries(await request.formData());
  const parsed = SuggestionSchema.safeParse(form);
  if (!parsed.success) {
    return data<ActionResult>(
      { fieldErrors: fieldErrorsFrom(parsed.error, { body: "suggestions.error.body" }) },
      { status: 400 },
    );
  }

  const result = await createSuggestion(user.id, parsed.data.body);
  if (!result.ok) {
    return data<ActionResult>({ error: t("suggestions.throttled") }, { status: 429 });
  }
  const session = context.get(sessionContext);
  if (session) await setFlash(session.id, "success", "toast.suggestionSent");
  return data<ActionResult>({ sent: true });
}

export default function Suggestions({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const bodyError = actionData?.fieldErrors?.body;

  return (
    <main className="container page page--narrow">
      <header className="page__head">
        <h1 className="page__title">{t("suggestions.title")}</h1>
        <p className="page__lead">{t("suggestions.lead")}</p>
      </header>

      {/* Remounting after a successful send clears the textarea. */}
      <Form method="post" className="form" noValidate key={actionData?.sent ? "sent" : "edit"}>
        <Field label={t("suggestions.label")} error={bodyError ? t(bodyError) : undefined}>
          <textarea
            className="field__input field__input--multiline"
            name="body"
            rows={6}
            maxLength={SUGGESTION_MAX_LENGTH}
            placeholder={t("suggestions.placeholder")}
            required
            aria-invalid={bodyError ? true : undefined}
          />
        </Field>
        {actionData?.error ? (
          <p className="alert" role="alert">
            {actionData.error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? t("suggestions.sending") : t("suggestions.submit")}
        </button>
      </Form>

      <p className="page__back">
        <Link to="/subjects">{t("subject.backToSubjects")}</Link>
      </p>
    </main>
  );
}
