import type { ReactNode } from "react";
import { Link } from "react-router";
import type { TextDirection } from "~/shared/direction";

/**
 * The top of a page: an optional link back, the title, a lead line, and whatever belongs under
 * them (status pills, notes, tabs). `dir` and `leadDir` are for a title or lead written in a
 * subject's own language.
 */
export function PageHeader({
  back,
  title,
  lead,
  dir,
  leadDir,
  children,
}: {
  back?: { to: string; label: string };
  title: ReactNode;
  lead?: ReactNode;
  dir?: TextDirection;
  leadDir?: TextDirection;
  children?: ReactNode;
}) {
  return (
    <>
      {back ? (
        <p className="page__back page__back--top">
          <Link to={back.to}>{back.label}</Link>
        </p>
      ) : null}
      <header className="page__head">
        <h1 className="page__title" dir={dir}>
          {title}
        </h1>
        {lead ? (
          <p className="page__lead" dir={leadDir}>
            {lead}
          </p>
        ) : null}
        {children}
      </header>
    </>
  );
}
