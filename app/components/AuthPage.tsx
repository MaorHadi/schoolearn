import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

/**
 * Shell for login/register: header plus a single centered panel holding the form.
 */
export function AuthPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader signedIn={false} />
      <main className="auth">
        <section className="auth__panel">
          <h1 className="auth__title">{title}</h1>
          <p className="auth__lead">{lead}</p>
          {children}
        </section>
      </main>
    </>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
