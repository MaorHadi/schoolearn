import { Save } from "lucide-react";
import { Form, Link, data, useNavigation } from "react-router";
import type { Route } from "./+types/settings";
import { Field } from "~/components/AuthPage";
import { t, type TranslationKey } from "~/i18n";
import {
  MEBIBYTE,
  SUGGESTIONS_MAX_PER_DAY_LIMIT,
  SystemSettingsFormSchema,
  UPLOAD_MAX_MEGABYTES_LIMIT,
  type SystemSettingsFormField,
} from "~/schemas/system-settings";
import { requireRole } from "~/server/auth/context.server";
import { flashFromContext } from "~/server/flash.server";
import { getSystemSettings, updateSystemSettings } from "~/server/settings/settings.server";
import { fieldErrorsFrom } from "~/shared/field-errors";

type FieldErrors = Partial<Record<SystemSettingsFormField, TranslationKey>>;

interface ActionResult {
  fieldErrors: FieldErrors;
}

/** One message key per field that can fail validation. */
const FIELD_MESSAGES: Record<
  Exclude<SystemSettingsFormField, "registrationOpen">,
  TranslationKey
> = {
  contactEmail: "systemAdmin.settings.error.contactEmail",
  suggestionsMaxPerDay: "systemAdmin.settings.error.suggestionsMaxPerDay",
  uploadMaxMegabytes: "systemAdmin.settings.error.uploadMaxMegabytes",
};

export async function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  const settings = await getSystemSettings();
  return {
    contactEmail: settings.contactEmail ?? "",
    suggestionsMaxPerDay: settings.suggestionsMaxPerDay,
    registrationOpen: settings.registrationOpen,
    // The form works in whole megabytes; a smaller .env default shows as the 1 MB minimum.
    uploadMaxMegabytes: Math.max(1, Math.round(settings.uploadMaxBytes / MEBIBYTE)),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = requireRole(context, "SYSTEM_ADMIN");
  const form = Object.fromEntries(await request.formData());
  const parsed = SystemSettingsFormSchema.safeParse(form);
  if (!parsed.success) {
    return data<ActionResult>(
      { fieldErrors: fieldErrorsFrom(parsed.error, FIELD_MESSAGES) },
      { status: 400 },
    );
  }
  await updateSystemSettings(parsed.data, user.id);
  await flashFromContext(context, "success", "toast.settingsSaved");
  return null;
}

export default function SystemSettingsPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const fieldErrors: FieldErrors = actionData?.fieldErrors ?? {};
  const errorFor = (field: SystemSettingsFormField) => {
    const key = fieldErrors[field];
    return key ? t(key) : undefined;
  };
  const invalid = (field: SystemSettingsFormField) => (fieldErrors[field] ? true : undefined);

  return (
    <main className="container page page--narrow">
      <p className="page__back page__back--top">
        <Link to="/system-admin">{t("systemAdmin.settings.back")}</Link>
      </p>
      <header className="page__head">
        <h1 className="page__title">{t("systemAdmin.settings.title")}</h1>
        <p className="page__lead">{t("systemAdmin.settings.lead")}</p>
      </header>

      <Form method="post" className="form admin-form" noValidate>
        <label className="field field--inline">
          <input
            type="checkbox"
            name="registrationOpen"
            defaultChecked={loaderData.registrationOpen}
          />
          <span className="field__label">{t("systemAdmin.settings.registrationOpen")}</span>
        </label>

        <Field label={t("systemAdmin.settings.contactEmail")} error={errorFor("contactEmail")}>
          <input
            className="field__input"
            name="contactEmail"
            type="email"
            dir="ltr"
            defaultValue={loaderData.contactEmail}
            aria-invalid={invalid("contactEmail")}
          />
        </Field>

        <Field
          label={t("systemAdmin.settings.suggestionsMaxPerDay")}
          error={errorFor("suggestionsMaxPerDay")}
        >
          <input
            className="field__input"
            name="suggestionsMaxPerDay"
            type="number"
            min={1}
            max={SUGGESTIONS_MAX_PER_DAY_LIMIT}
            defaultValue={loaderData.suggestionsMaxPerDay}
            aria-invalid={invalid("suggestionsMaxPerDay")}
          />
        </Field>

        <Field
          label={t("systemAdmin.settings.uploadMaxMegabytes")}
          error={errorFor("uploadMaxMegabytes")}
        >
          <input
            className="field__input"
            name="uploadMaxMegabytes"
            type="number"
            min={1}
            max={UPLOAD_MAX_MEGABYTES_LIMIT}
            defaultValue={loaderData.uploadMaxMegabytes}
            aria-invalid={invalid("uploadMaxMegabytes")}
          />
        </Field>

        <button type="submit" className="btn btn--primary" disabled={busy}>
          <Save size={18} aria-hidden="true" />
          {busy ? t("systemAdmin.settings.saving") : t("systemAdmin.settings.save")}
        </button>
      </Form>
    </main>
  );
}
