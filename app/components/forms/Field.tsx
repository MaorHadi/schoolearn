import type { ReactNode } from "react";

/**
 * A labelled form control with its hint and error. The label wraps the control, so no ids are
 * needed. `hideLabel` keeps the label for screen readers only (compact rows); `className`
 * replaces the default `field` layout class.
 */
export function Field({
  label,
  error,
  hint,
  hideLabel = false,
  className = "field",
  children,
}: {
  label: string;
  /** Already translated. */
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className={hideLabel ? "visually-hidden" : "field__label"}>{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
