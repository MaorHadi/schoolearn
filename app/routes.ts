import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Public (see app/config/public-routes.ts)
  route("login", "routes/public/login.tsx"),
  route("register", "routes/public/register.tsx"),
  route("logout", "routes/public/logout.tsx"),
  route("media/*", "routes/media.$.tsx"),
  route("theme", "routes/theme.tsx"),

  // Guarded: any signed-in user
  layout("routes/app/layout.tsx", [
    route("subjects", "routes/app/subjects.tsx"),
    route("subjects/:slug", "routes/app/subjects.$slug.tsx"),
    route("subjects/:slug/lessons/:lessonId", "routes/app/subjects.$slug.lessons.$lessonId.tsx"),
    route("suggestions", "routes/app/suggestions.tsx"),
  ]),

  // Guarded: ADMIN and above (content management)
  ...prefix("admin", [
    layout("routes/admin/layout.tsx", [
      index("routes/admin/index.tsx"),
      route("subjects/new", "routes/admin/subjects.new.tsx"),
      route("subjects/:subjectId", "routes/admin/subjects.$subjectId.tsx"),
      route("lessons/:lessonId", "routes/admin/lessons.$lessonId.tsx"),
      route("lessons/:lessonId/questions", "routes/admin/lessons.$lessonId.questions.tsx"),
      route("publish", "routes/admin/publish.tsx"),
    ]),
  ]),

  // Guarded: SYSTEM_ADMIN only (users, system settings)
  ...prefix("system-admin", [
    layout("routes/system-admin/layout.tsx", [
      index("routes/system-admin/index.tsx"),
      route("users", "routes/system-admin/users.tsx"),
      route("users/:userId", "routes/system-admin/users.$userId.tsx"),
      route("suggestions", "routes/system-admin/suggestions.tsx"),
      route("settings", "routes/system-admin/settings.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
