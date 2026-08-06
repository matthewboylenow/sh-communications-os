import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * The module boundary rule.
 *
 * Anything outside a module folder may import "@/modules/<name>" and nothing
 * deeper. Reaching into "@/modules/editorial/service" from a page would make
 * the module unreplaceable, which is the one thing this architecture is for.
 *
 * A module's own files use relative imports internally, so they are unaffected.
 */
const boundaries = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/modules/*/*"],
            message:
              "Import a module's public contract only: @/modules/<name>. Reaching into internals breaks the boundary.",
          },
          {
            group: ["**/../modules/**"],
            message: "Use the @/modules/<name> alias, not a relative path across modules.",
          },
        ],
      },
    ],
  },
};

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts"],
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/core/**/*.ts", "scripts/**/*.ts"],
    ...boundaries,
  },
  {
    // core/db/schema.ts is the one sanctioned exception: Drizzle needs a single
    // entry point that names every module's tables.
    files: ["src/core/db/schema.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];

export default config;
