import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config, requireDatabaseUrl } from "@/core/config";
import * as schema from "./schema";

/**
 * Lazy singleton. Building the client at import time would make `next build`
 * fail without a database, and the build should not need one.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (!_db) {
    const sql = neon(requireDatabaseUrl());
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export function dbConfigured(): boolean {
  return Boolean(config.databaseUrl);
}

export { schema };
