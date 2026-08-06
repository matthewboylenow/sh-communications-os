import { config as loadDotenv } from "dotenv";

/**
 * Environment loading for the CLI tools (drizzle-kit, the seed script).
 *
 * Next.js reads .env.local automatically. Nothing else does, and bare
 * `import "dotenv/config"` only reads .env, which is how you end up staring at
 * "Please provide required params for Postgres driver: url: ''" with a
 * perfectly good .env.local sitting right there.
 *
 * Order matters: .env.local wins, matching Next's own precedence.
 */
for (const file of [".env.local", ".env"]) {
  loadDotenv({ path: file, override: false });
}

/**
 * `db:generate` writes SQL from the schema and never touches a database, so it
 * must keep working without a URL. Everything else genuinely needs one.
 */
const NEEDS_DB = ["push", "migrate", "studio", "pull", "check", "up"];

/**
 * Catches the two ways a connection string arrives broken.
 *
 * The common one: the key name ends up inside the value, because the whole
 * `KEY=value` line got pasted into an editor that already had the key, or into
 * an `export KEY=` command. Postgres then hands you "TypeError: Invalid URL"
 * from ten frames deep in a driver, which tells you nothing.
 */
function validateDatabaseUrl(url: string): void {
  const dupKey = /^\s*(?:export\s+)?DATABASE_URL\s*=/i;
  if (dupKey.test(url)) {
    throw new Error(
      [
        "DATABASE_URL contains its own name.",
        "",
        `  DATABASE_URL=${url.slice(0, 40)}...`,
        "",
        "The value has to be just the connection string. Edit .env.local so the",
        "line reads:",
        "",
        '  DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"',
        "",
        "One DATABASE_URL, one equals sign.",
      ].join("\n"),
    );
  }

  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      `DATABASE_URL does not look like a Postgres connection string. It starts with "${url.slice(0, 20)}".`,
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error(
      "DATABASE_URL is not a parseable URL. A stray quote or a line break in .env.local is the usual cause.",
    );
  }
}

export function assertDatabaseUrl(): string {
  // Strip quotes an editor may have left behind, and any trailing whitespace.
  const url = (process.env.DATABASE_URL ?? "").trim().replace(/^["']|["']$/g, "");
  const command = process.argv.find((a) => NEEDS_DB.includes(a));

  if (url) {
    validateDatabaseUrl(url);
    return url;
  }
  if (command) {
    throw new Error(
      [
        "DATABASE_URL is not set.",
        "",
        "Create a Postgres database first, then put its connection string in",
        ".env.local at the repository root:",
        "",
        '  DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"',
        "",
        "In a Codespace you can also set it for the session with:",
        "",
        "  export DATABASE_URL='postgresql://...'",
        "",
        "Neon gives you the string under Connection Details. If the database is",
        "attached to the Vercel project, Storage > your database > .env.local",
        "has it, or run `vercel env pull .env.local`.",
      ].join("\n"),
    );
  }
  return url;
}

/** Same validation for the running app, so a bad Vercel value fails loudly. */
export { validateDatabaseUrl };
