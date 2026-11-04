import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "~/i18n";
import type { Toast } from "~/schemas/toast";

const AUTO_DISMISS_MS = 6000;

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert } as const;

function toastText(toast: Toast): string {
  let text: string = t(toast.key);
  for (const [name, value] of Object.entries(toast.values ?? {})) {
    text = text.replace(`{${name}}`, value);
  }
  return text;
}

/**
 * Bottom-corner notifications. Receives the one toast the root loader took from the session;
 * keeps a short local queue so several quick actions each get their own card.
 */
export function Toaster({ toast }: { toast: Toast | null }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  // Adopt a newly arrived toast during render (React's "derive state from props" pattern),
  // so a re-render carrying the same toast id does not add it twice.
  if (toast && toast.id !== lastSeenId) {
    setLastSeenId(toast.id);
    setQueue((current) => [...current, toast]);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setQueue((current) => current.filter((entry) => entry.id !== toast.id));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const dismiss = (id: string) => setQueue((current) => current.filter((entry) => entry.id !== id));

  return (
    <div className="toaster" role="status" aria-live="polite">
      {queue.map((entry) => {
        const Icon = ICONS[entry.kind];
        return (
          <div key={entry.id} className={`toast toast--${entry.kind}`}>
            <Icon className="toast__icon" size={20} aria-hidden="true" />
            <p className="toast__text">{toastText(entry)}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(entry.id)}
              aria-label={t("toast.dismiss")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
