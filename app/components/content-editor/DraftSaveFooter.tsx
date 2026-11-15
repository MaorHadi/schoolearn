import { Save } from "lucide-react";
import { useNavigation } from "react-router";
import { t, type TranslationKey } from "~/i18n";

/**
 * The bottom of a draft editor form: why saving is unavailable (the list is incomplete), the
 * server's refusal of the last save, and the save button. `intent` is the form's intent, used to
 * tell this form's submission from others on the page.
 */
export function DraftSaveFooter({
  intent,
  complete,
  incompleteMessage,
  formError,
}: {
  intent: string;
  complete: boolean;
  incompleteMessage: TranslationKey;
  formError?: TranslationKey;
}) {
  const navigation = useNavigation();
  const saving = navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
  return (
    <>
      {!complete ? (
        <p className="alert" role="alert">
          {t(incompleteMessage)}
        </p>
      ) : null}
      {formError ? (
        <p className="alert" role="alert">
          {t(formError)}
        </p>
      ) : null}
      <button type="submit" className="btn btn--primary" disabled={saving || !complete}>
        <Save size={18} aria-hidden="true" />
        {saving ? t("admin.editor.saving") : t("admin.editor.saveDraft")}
      </button>
    </>
  );
}
