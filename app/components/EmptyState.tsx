import type { LucideProps } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

/** What a list page shows when there is nothing to list: an icon and one line. */
export function EmptyState({
  icon: Icon,
  children,
}: {
  icon: ComponentType<LucideProps>;
  children: ReactNode;
}) {
  return (
    <div className="empty empty--rich">
      <Icon size={28} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
