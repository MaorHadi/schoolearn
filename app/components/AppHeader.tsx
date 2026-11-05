import { LogOut, MessagesSquare, Settings, ShieldCheck, LibraryBig } from "lucide-react";
import { Form, NavLink } from "react-router";
import { t } from "~/i18n";
import { ThemeToggle } from "./ThemeToggle";

export interface AppHeaderProps {
  username?: string;
  showAdmin?: boolean;
  showSystemAdmin?: boolean;
  /** When false (auth pages) the header shows only the brand and theme toggle. */
  signedIn?: boolean;
  /** Match the subjects page's middle column instead of the standard page width. */
  alignWithSubjects?: boolean;
}

export function AppHeader({
  username,
  showAdmin,
  showSystemAdmin,
  signedIn = true,
  alignWithSubjects = false,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div
        className={`app-header__inner${alignWithSubjects ? " app-header__inner--subjects" : ""}`}
      >
        <NavLink to={signedIn ? "/subjects" : "/login"} className="brand">
          <span className="brand__mark" aria-hidden="true" />
          {t("app.name")}
        </NavLink>
        <nav className="app-header__nav" aria-label={t("nav.label")}>
          {signedIn ? (
            <>
              <NavLink to="/subjects">
                <LibraryBig size={20} aria-hidden="true" />
                <span className="label">{t("nav.subjects")}</span>
              </NavLink>
              <NavLink to="/forum">
                <MessagesSquare size={20} aria-hidden="true" />
                <span className="label">{t("nav.forum")}</span>
              </NavLink>
              {showAdmin ? (
                <NavLink to="/admin">
                  <Settings size={20} aria-hidden="true" />
                  <span className="label">{t("nav.admin")}</span>
                </NavLink>
              ) : null}
              {showSystemAdmin ? (
                <NavLink to="/system-admin">
                  <ShieldCheck size={20} aria-hidden="true" />
                  <span className="label">{t("nav.systemAdmin")}</span>
                </NavLink>
              ) : null}
              {username ? <span className="app-header__user">{username}</span> : null}
              <ThemeToggle />
              <Form method="post" action="/logout">
                <button type="submit">
                  <LogOut size={20} aria-hidden="true" />
                  <span className="label">{t("nav.logout")}</span>
                </button>
              </Form>
            </>
          ) : (
            <ThemeToggle />
          )}
        </nav>
      </div>
    </header>
  );
}
