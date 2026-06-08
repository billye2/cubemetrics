// Minimal .env loader for the E2E harness — pulls Supabase URL/keys from
// `.env.local` (created by `vercel env pull`) and the generated test-user creds
// from `e2e/.auth/e2e.env`. No dependency on dotenv; never prints any value.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseInto(file, { override = false } = {}) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || process.env[key] === undefined) process.env[key] = val;
  }
}

/** Load `.env.local` then the gitignored test-user creds into process.env. */
export function loadEnv() {
  parseInto(resolve(root, ".env.local"));
  parseInto(resolve(root, "e2e/.auth/e2e.env"));
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    baseURL: process.env.E2E_BASE_URL || "https://cubemetrics.com",
    // Real test-account email lives in env (.env.local / e2e/.auth/e2e.env), never
    // in source — this public repo names no real account. .test is RFC-6761 reserved.
    email: process.env.E2E_EMAIL || "e2e@example.test",
    password: process.env.E2E_PASSWORD,
  };
}

export const ROOT = root;
