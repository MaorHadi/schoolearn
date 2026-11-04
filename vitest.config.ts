import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    // DB test files share one database, so they must run one at a time.
    fileParallelism: false,
    // Reuse the worker across files so the module graph (Prisma client, React, jsdom) loads once
    // per environment instead of once per file.
    isolate: false,
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` docblock.
  },
});
