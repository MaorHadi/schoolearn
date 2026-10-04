import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

/**
 * Shell for login/register: a vertical accent line with a single station marker beside the
 * form, echoing the lesson path the student is about to travel.
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
        <div className="auth__line" aria-hidden="true">
          <span className="auth__station" />
        </div>
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
