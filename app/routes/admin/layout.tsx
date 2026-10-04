import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { AppHeader } from "~/components/AppHeader";
import { requireRole } from "~/server/auth/context.server";
import { hasRole } from "~/shared/roles";

export function loader({ context }: Route.LoaderArgs) {
  const user = requireRole(context, "ADMIN");
  return { username: user.username, isSystemAdmin: hasRole(user.role, "SYSTEM_ADMIN") };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <AppHeader
        username={loaderData.username}
        showAdmin
        showSystemAdmin={loaderData.isSystemAdmin}
      />
      <Outlet />
    </>
  );
}
