import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Public (see app/config/public-routes.ts)
  route("login", "routes/public/login.tsx"),
  route("register", "routes/public/register.tsx"),
  route("logout", "routes/public/logout.tsx"),

  // Guarded: any signed-in user
  layout("routes/app/layout.tsx", [route("subjects", "routes/app/subjects.tsx")]),

  // Guarded: ADMIN and above
  ...prefix("admin", [
    layout("routes/admin/layout.tsx", [
      index("routes/admin/index.tsx"),
      route("users", "routes/admin/users.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
