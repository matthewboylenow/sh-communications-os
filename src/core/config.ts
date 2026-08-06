/**
 * Environment access. One file, so a missing variable is one place to look.
 * Nothing here throws at import time, because `next build` runs without a
 * database and a build that needs production credentials is a build that
 * eventually gets skipped.
 */

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const config = {
  databaseUrl: env("DATABASE_URL"),
  authSecret: env("AUTH_SECRET"),
  blobToken: env("BLOB_READ_WRITE_TOKEN"),

  /** Shared secret the scheduled Cowork run uses on /api/v1/*. */
  agentToken: env("AGENT_API_TOKEN"),

  buffer: {
    accessToken: env("BUFFER_ACCESS_TOKEN"),
    endpoint: env("BUFFER_GRAPHQL_ENDPOINT") ?? "https://graph.buffer.com/",
  },

  parish: {
    name: "Saint Helen",
    timezone: "America/New_York",
    website: "https://sainthelen.org",
  },

  isProd: process.env.NODE_ENV === "production",
} as const;

export function requireDatabaseUrl(): string {
  if (!config.databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return config.databaseUrl;
}
