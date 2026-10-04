import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { AppHeader } from "~/components/AppHeader";
import { requireRole } from "~/server/auth/context.server";

export function loader({ context }: Route.LoaderArgs) {
  const user = requireRole(context, "SYSTEM_ADMIN");
  return { username: user.username };
}

export default function SystemAdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <AppHeader username={loaderData.username} showAdmin showSystemAdmin />
      <Outlet />
    </>
  );
}
