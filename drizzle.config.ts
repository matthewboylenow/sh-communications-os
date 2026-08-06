import "./src/core/lib/load-env";
import type { Config } from "drizzle-kit";
import { assertDatabaseUrl } from "./src/core/lib/load-env";

export default {
  schema: "./src/core/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: assertDatabaseUrl(),
  },
  // Each module owns a table prefix. See ARCHITECTURE.md.
  verbose: true,
  strict: true,
} satisfies Config;
