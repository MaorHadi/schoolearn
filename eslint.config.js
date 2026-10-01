import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "build/**",
      ".react-router/**",
      "prisma/generated/**",
      "node_modules/**",
      "legacy-android/**",
      "storage/**",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    // Server-only modules must never be imported from client-capable files.
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/**/*.server.{ts,tsx}", "app/entry.server.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/*.server", "**/*.server.ts", "**/*.server.tsx"],
              message:
                "Server modules may only be imported from other *.server.ts files or from route modules (React Router strips loaders/actions/middleware from the client bundle).",
            },
            {
              group: ["@prisma/client", "**/prisma/generated/*", "~/lib/db.server"],
              message: "Prisma only in *.server.ts files.",
            },
          ],
        },
      ],
    },
  },
  {
    // Route modules may import server code: loaders/actions/middleware are stripped from the client.
    files: ["app/routes/**/*.tsx", "app/root.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  prettier,
);
