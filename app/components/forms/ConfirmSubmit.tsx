import type { ReactNode } from "react";
import { Form } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { t } from "~/i18n";

interface ConfirmSubmitProps {
  /** The button that opens the dialog; rendered as-is (it must accept a ref and onClick). */
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  /** Hidden fields posted to the current route's action when confirmed. */
  fields: Record<string, string>;
  /** "destructive" for actions like disable or delete. */
  variant?: "default" | "destructive";
}

/**
 * A confirm dialog whose confirm button submits a POST with `fields` to the current route.
 * Replaces `window.confirm` in front of a form submit; the dialog closes when the navigation
 * completes because the page re-renders.
 */
export function ConfirmSubmit({
  trigger,
  title,
  description,
  confirmLabel,
  fields,
  variant = "default",
}: ConfirmSubmitProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <Form method="post" className="contents">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction type="submit" variant={variant}>
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
