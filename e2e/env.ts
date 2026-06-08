// Env loader for the Playwright side (config + auth setup). Mirrors env.mjs,
// which the plain-node provision script uses — kept separate because Playwright's
// module loader transpiles TS but mishandles a sibling .mjs import. Never prints
// any value.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Playwright runs from the project root (cwd). Avoid import.meta here — Playwright
// transpiles this TS to CJS, and import.meta would force an ESM/CJS clash.
const root = process.cwd();

function parseInto(file: string, override = false): void {
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
