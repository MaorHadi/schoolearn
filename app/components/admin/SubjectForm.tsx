import { Form, useNavigation } from "react-router";
import { Field } from "~/components/AuthPage";
import { SubjectIcon } from "~/components/SubjectIcon";
import { t, type TranslationKey } from "~/i18n";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type SubjectFormField,
} from "~/schemas/admin-content";
import { CONTENT_LOCALES } from "~/shared/content-locales";
import { DEFAULT_SUBJECT_THEME, resolveSubjectTheme, SUBJECT_ICONS } from "~/shared/subject-theme";

/** One message key per field, for `fieldErrorsFrom()` in the subject actions. */
export const SUBJECT_FIELD_MESSAGES: Record<SubjectFormField, TranslationKey> = {
  slug: "admin.error.slug",
  name: "admin.error.name",
  description: "admin.error.description",
  locale: "admin.error.locale",
  direction: "admin.error.direction",
  accentColor: "admin.error.accentColor",
  icon: "admin.error.icon",
};

export type SubjectFieldErrors = Partial<Record<SubjectFormField, TranslationKey>>;

export interface SubjectFormValues {
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  direction: "rtl" | "ltr";
  accentColor: string;
  icon: string;
}

const EMPTY: SubjectFormValues = {
  slug: "",
  name: "",
  description: null,
  locale: "he",
  direction: "rtl",
  accentColor: DEFAULT_SUBJECT_THEME.accentColor,
  icon: DEFAULT_SUBJECT_THEME.icon,
};

/** Create/edit form for a subject's metadata. Posts `intent` so the edit page can dispatch. */
export function SubjectForm({
  values = EMPTY,
  fieldErrors = {},
  intent,
  submitLabel,
}: {
  values?: SubjectFormValues;
  fieldErrors?: SubjectFieldErrors;
  intent: string;
  submitLabel: string;
}) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
  const errorFor = (field: SubjectFormField) => {
    const key = fieldErrors[field];
    return key ? t(key) : undefined;
  };
  const invalid = (field: SubjectFormField) => (fieldErrors[field] ? true : undefined);
  const selectedIcon = resolveSubjectTheme(values).icon;

  return (
    <Form method="post" className="form admin-form" noValidate>
      <input type="hidden" name="intent" value={intent} />

      <Field label={t("admin.subject.form.name")} error={errorFor("name")}>
        <input
          className="field__input"
          name="name"
          defaultValue={values.name}
          maxLength={TITLE_MAX_LENGTH}
          aria-invalid={invalid("name")}
        />
      </Field>

      <Field label={t("admin.subject.form.slug")} error={errorFor("slug")}>
        <input
          className="field__input"
          name="slug"
          dir="ltr"
          defaultValue={values.slug}
          maxLength={64}
          aria-invalid={invalid("slug")}
        />
      </Field>

      <Field label={t("admin.subject.form.description")} error={errorFor("description")}>
        <textarea
          className="field__input field__input--multiline"
          name="description"
          rows={3}
          defaultValue={values.description ?? ""}
          maxLength={DESCRIPTION_MAX_LENGTH}
          aria-invalid={invalid("description")}
        />
      </Field>

      <div className="admin-form__row">
        <Field label={t("admin.subject.form.locale")} error={errorFor("locale")}>
          <select
            className="field__input select"
            name="locale"
            defaultValue={values.locale}
            aria-invalid={invalid("locale")}
          >
            {CONTENT_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {t(`admin.subject.form.locale.${locale}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("admin.subject.form.direction")} error={errorFor("direction")}>
          <select
            className="field__input select"
            name="direction"
            defaultValue={values.direction}
            aria-invalid={invalid("direction")}
          >
            <option value="rtl">{t("admin.subject.form.direction.rtl")}</option>
            <option value="ltr">{t("admin.subject.form.direction.ltr")}</option>
          </select>
        </Field>
      </div>

      <Field label={t("admin.subject.form.accentColor")} error={errorFor("accentColor")}>
        <input
          className="field__input field__input--color"
          name="accentColor"
          type="color"
          defaultValue={values.accentColor}
          aria-invalid={invalid("accentColor")}
        />
      </Field>

      <fieldset className="field m-0 min-w-0 border-0 p-0" aria-invalid={invalid("icon")}>
        <legend className="field__label p-0">{t("admin.subject.form.icon")}</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
          {SUBJECT_ICONS.map((icon) => (
            <label
              key={icon}
              title={t(`admin.subject.icon.${icon}`)}
              className="grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-solid border-border text-foreground hover:bg-secondary has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                className="sr-only"
                type="radio"
                name="icon"
                value={icon}
                defaultChecked={icon === selectedIcon}
              />
              <SubjectIcon name={icon} size={22} />
              <span className="sr-only">{t(`admin.subject.icon.${icon}`)}</span>
            </label>
          ))}
        </div>
        {errorFor("icon") ? (
          <span className="field__error" role="alert">
            {errorFor("icon")}
          </span>
        ) : null}
      </fieldset>

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {submitLabel}
      </button>
    </Form>
  );
}
