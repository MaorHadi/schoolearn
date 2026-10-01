import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
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
  let title = "שגיאה";
  let detail = "אירעה שגיאה בלתי צפויה.";
  if (isRouteErrorResponse(error)) {
    title = String(error.status);
    detail = typeof error.data === "string" ? error.data : error.statusText;
  }
  return (
    <main className="container">
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  );
}
