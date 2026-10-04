import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

/**
 * Placeholder for admin areas that are not built yet. Same page scaffolding as real pages so
 * the shell feels finished; the empty state says plainly that the tool is not available yet.
 */
export function StubPage({
  title,
  lead,
  message,
  icon: Icon,
}: {
  title: string;
  lead?: string;
  message: string;
  icon: ComponentType<LucideProps>;
}) {
  return (
    <main className="container page">
      <header className="page__head">
        <h1 className="page__title">{title}</h1>
        {lead ? <p className="page__lead">{lead}</p> : null}
      </header>
      <div className="empty empty--rich">
        <Icon size={28} aria-hidden="true" />
        <p>{message}</p>
      </div>
    </main>
  );
}
