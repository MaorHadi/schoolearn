import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { t } from "~/i18n";
import { authMiddleware } from "~/server/auth/middleware.server";
import "./app.css";

/** Single route guard for the whole app. See app/config/public-routes.ts for the allowlist. */
export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

/** A root loader forces the middleware to run on every client-side navigation as well. */
export function loader() {
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
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
