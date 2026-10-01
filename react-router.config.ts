import type { Config } from "@react-router/dev/config";

// Middleware is on by default in React Router v8; no future flag needed.
export default {
  ssr: true,
} satisfies Config;
