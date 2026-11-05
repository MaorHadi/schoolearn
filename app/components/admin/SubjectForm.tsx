import { Form, useNavigation } from "react-router";
import { Field } from "~/components/AuthPage";
import { t, type TranslationKey } from "~/i18n";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type SubjectFormField,
} from "~/schemas/admin-content";
import { DEFAULT_SUBJECT_THEME, SUBJECT_ICONS } from "~/shared/subject-theme";

/** One message key per field, for `fieldErrorsFrom()` in the subject actions. */
export const SUBJECT_FIELD_MESSAGES: Record<SubjectFormField, TranslationKey> = {
  slug: "admin.error.slug",
  name: "admin.error.name",
  description: "admin.error.description",
  locale: "admin.error.locale",
  direction: "admin.error.direction",
  sortOrder: "admin.error.sortOrder",
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
  sortOrder: number;
  accentColor: string;
  icon: string;
}

const EMPTY: SubjectFormValues = {
  slug: "",
  name: "",
  description: null,
  locale: "he",
  direction: "rtl",
  sortOrder: 0,
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
          <input
            className="field__input"
            name="locale"
            dir="ltr"
            defaultValue={values.locale}
            maxLength={16}
            aria-invalid={invalid("locale")}
          />
          <span className="field__hint">{t("admin.subject.form.localeHint")}</span>
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

      <div className="admin-form__row">
        <Field label={t("admin.subject.form.sortOrder")} error={errorFor("sortOrder")}>
          <input
            className="field__input"
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={values.sortOrder}
            aria-invalid={invalid("sortOrder")}
          />
        </Field>

        <Field label={t("admin.subject.form.accentColor")} error={errorFor("accentColor")}>
          <input
            className="field__input field__input--color"
            name="accentColor"
            type="color"
            defaultValue={values.accentColor}
            aria-invalid={invalid("accentColor")}
          />
        </Field>

        <Field label={t("admin.subject.form.icon")} error={errorFor("icon")}>
          <select
            className="field__input select"
            name="icon"
            defaultValue={values.icon}
            aria-invalid={invalid("icon")}
          >
            {SUBJECT_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {submitLabel}
      </button>
    </Form>
  );
}
