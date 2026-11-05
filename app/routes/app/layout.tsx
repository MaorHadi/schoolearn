import { Outlet, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { AppHeader } from "~/components/AppHeader";
import { requireUser } from "~/server/auth/context.server";
import { hasRole } from "~/shared/roles";

export function loader({ context }: Route.LoaderArgs) {
  const user = requireUser(context);
  return {
    username: user.username,
    isAdmin: hasRole(user.role, "ADMIN"),
    isSystemAdmin: hasRole(user.role, "SYSTEM_ADMIN"),
  };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { pathname } = useLocation();
  return (
    <>
      <AppHeader
        username={loaderData.username}
        showAdmin={loaderData.isAdmin}
        showSystemAdmin={loaderData.isSystemAdmin}
        alignWithSubjects={pathname === "/subjects"}
      />
      <Outlet />
    </>
  );
}
