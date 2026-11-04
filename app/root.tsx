import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { useRouteLoaderData } from "react-router";
import { Toaster } from "~/components/Toaster";
import { t } from "~/i18n";
import { sessionContext } from "~/server/auth/context.server";
import { authMiddleware } from "~/server/auth/middleware.server";
import { getTheme } from "~/server/theme.server";
import { takeFlash } from "~/server/flash.server";
import "@fontsource-variable/heebo";
import "@fontsource-variable/noto-serif-hebrew";
import "./app.css";

/** Single route guard for the whole app. See app/config/public-routes.ts for the allowlist. */
export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

/**
 * Runs on every navigation (which also forces the middleware to run); supplies the theme and
 * the pending toast (taken from the session so it survives redirects).
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const session = context.get(sessionContext);
  const [theme, toast] = await Promise.all([
    getTheme(request),
    session ? takeFlash(session) : Promise.resolve(null),
  ]);
  return { theme, toast };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const rootData = useRouteLoaderData<typeof loader>("root");
  const theme = rootData?.theme ?? undefined;
  const toast = rootData?.toast ?? null;
  return (
    <html lang="he" dir="rtl" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content={theme ?? "light dark"} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Toaster toast={toast} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = t("error.title");
  let detail = t("error.generic");
  if (isRouteErrorResponse(error)) {
    title = String(error.status);
    if (error.status === 404) {
      // Covers our own data() 404s and React Router's English "No route matches URL" default.
      detail = t("error.notFound");
    } else if (typeof error.data === "string" && error.data.length > 0) {
      detail = error.data;
    }
  }
  return (
    <main className="container">
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  );
}
