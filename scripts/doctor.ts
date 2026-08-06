import { readFileSync, existsSync } from "node:fs";

/**
 * Answers "why is it using that value" without printing a password.
 *
 * Run before db:push when something does not add up. The precedence rules
 * across a shell export, .env.local and .env are exactly the kind of thing
 * that costs an hour and looks obvious afterwards.
 */

const shellValue = process.env.DATABASE_URL;

// Import the loader AFTER capturing the shell value, so we can tell them apart.
import("../src/core/lib/load-env").then(() => {
  const KEYS = ["DATABASE_URL", "AUTH_SECRET", "AGENT_API_TOKEN", "BLOB_READ_WRITE_TOKEN"];

  console.log("\nSaint Helen Communications OS, environment check\n");

  const files = [".env.local", ".env"].filter(existsSync);
  console.log(files.length ? `Files found: ${files.join(", ")}` : "No .env.local or .env found.");

  const fileValues = new Map<string, { file: string; value: string }[]>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) return;
      const [, key, rawValue] = m;
      const value = rawValue.trim().replace(/^["']|["']$/g, "");
      if (!fileValues.has(key)) fileValues.set(key, []);
      fileValues.get(key)!.push({ file: `${file}:${i + 1}`, value });
    });
  }

  console.log("");
  for (const key of KEYS) {
    const active = process.env[key];
    const inFiles = fileValues.get(key) ?? [];
    const fromShell = shellValue !== undefined && key === "DATABASE_URL" && active === shellValue;

    if (!active) {
      console.log(`${key}\n  not set\n`);
      continue;
    }

    const source = fromShell
      ? "SHELL EXPORT (this beats .env.local)"
      : inFiles.find((f) => f.value === active)?.file ?? "unknown";

    console.log(`${key}\n  value  ${describe(key, active)}\n  from   ${source}`);

    if (inFiles.length > 1) {
      console.log(`  note   defined ${inFiles.length} times: ${inFiles.map((f) => f.file).join(", ")}`);
    }
    if (fromShell && inFiles.length) {
      console.log(
        `  note   .env.local also sets this, and it is being IGNORED.\n         Run: unset ${key}`,
      );
    }
    console.log("");
  }

  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const u = new URL(url);
      console.log("Parsed connection string");
      console.log(`  host      ${u.hostname}`);
      console.log(`  database  ${u.pathname.replace(/^\//, "")}`);
      console.log(`  user      ${u.username}`);
      console.log(`  password  ${mask(decodeURIComponent(u.password))}`);
      console.log(`  pooled    ${u.hostname.includes("-pooler") ? "yes" : "no"}`);
      console.log(`  params    ${u.search || "(none)"}`);
      if (/[^\w.~-]/.test(u.password) && u.password === decodeURIComponent(u.password)) {
        console.log(
          "\n  Warning: the password has characters that need URL encoding. Percent-encode\n  them, or reset the role password to get a clean one.",
        );
      }
      console.log(
        "\nIf authentication fails with this exact password, reset the role password in\nthe Neon console and copy the whole new string in one go.",
      );
    } catch {
      console.log("DATABASE_URL is set but does not parse as a URL.");
    }
  }
  console.log("");
});

function describe(key: string, value: string) {
  return key === "DATABASE_URL" ? `${value.slice(0, 22)}...${value.slice(-18)}` : mask(value);
}

function mask(secret: string) {
  if (!secret) return "(empty)";
  if (secret.length <= 6) return `${"*".repeat(secret.length)} (${secret.length} chars)`;
  return `${secret.slice(0, 3)}${"*".repeat(secret.length - 6)}${secret.slice(-3)} (${secret.length} chars)`;
}
