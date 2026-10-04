import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useFetcher } from "react-router";
import { t } from "~/i18n";
import { parseTheme, type Theme } from "~/shared/theme";

// --- A tiny external store over the document's resolved theme ---------------------------
// The resolved theme lives outside React (the <html data-theme> attribute, or the OS
// preference when the user has not chosen). useSyncExternalStore is the right way to read it.

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function mediaQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const query = mediaQuery();
  query?.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    query?.removeEventListener("change", listener);
  };
}

function getSnapshot(): Theme {
  const chosen = parseTheme(document.documentElement.dataset.theme);
  if (chosen) return chosen;
  return mediaQuery()?.matches ? "dark" : "light";
}

function getServerSnapshot(): Theme | null {
  return null; // unknown during SSR; CSS handles the initial icon state
}

/**
 * One button, two icons. CSS cross-fades the sun and moon based on the resolved theme.
 * Clicking flips the attribute immediately for instant feedback and persists the choice
 * through /theme without a page reload.
 */
export function ThemeToggle() {
  const fetcher = useFetcher();
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = (current ?? getSnapshot()) === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    notify();
    void fetcher.submit({ theme: next }, { method: "post", action: "/theme" });
  }

  const label = current === "dark" ? t("theme.toLight") : t("theme.toDark");

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <Sun size={20} aria-hidden="true" className="theme-toggle__icon theme-toggle__sun" />
      <Moon size={20} aria-hidden="true" className="theme-toggle__icon theme-toggle__moon" />
    </button>
  );
}
