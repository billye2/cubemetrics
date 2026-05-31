#!/usr/bin/env node
// audit-apps.mjs — automated health check for all XP Boost apps.
//
// For every app it answers the two questions that have caused blank pages:
//   1. SCHEMA DRIFT — does the app query a table/column that doesn't exist in prod?
//      (this is the class of bug behind vision_cards, contact_log, goals.currency,
//       objectives.status — all "migration in repo but never applied to remote")
//   2. EMPTY DATA — does the app's backing table have rows for the test user?
//
// It needs NO browser and NO login: it statically scans the app source for
// supabase `.from("table").select("a,b,c")` references, then checks them against
// the live Postgres catalog (information_schema) + row counts, using the
// service-role key from .env.local.
//
// Usage:  node scripts/audit-apps.mjs [--email someone@example.com]
//
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "src/app/app");
const CATALOG_DIR = join(ROOT, "src/lib/modern/catalog/apps");
const TEST_EMAIL =
  process.argv.includes("--email")
    ? process.argv[process.argv.indexOf("--email") + 1]
    : "admin@example.com";

// ── load env ────────────────────────────────────────────────────────────────
const env = {};
const rawEnv = readFileSync(join(ROOT, ".env.local"), "utf8").replace(/^﻿/, "");
for (const line of rawEnv.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/\r$/, "").replace(/^["']|["']$/g, "");
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// ── tiny SQL runner via PostgREST RPC (creates a temp helper once) ───────────
async function rest(path, opts = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(opts.headers || {}) },
  });
  return r;
}

// Pull the full catalog of tables+columns from the DB in one go.
async function loadSchema() {
  // Reads the live public schema via the _audit_columns() helper (service-role only).
  const r = await rest("rpc/_audit_columns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (r.ok) return await r.json();
  console.error(`schema RPC failed (${r.status}): ${await r.text()}`);
  return null;
}

// ── resolve user id ──────────────────────────────────────────────────────────
async function getUserId(email) {
  const r = await rest(`../auth/v1/admin/users`, {});
  // admin users endpoint isn't under /rest; call directly
  const rr = await fetch(`${URL}/auth/v1/admin/users`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const j = await rr.json();
  const u = (j.users || []).find((x) => x.email === email);
  return u ? u.id : null;
}

// ── static scan: find table + column refs in an app's source ─────────────────
function scanApp(appId) {
  const dir = join(APP_DIR, appId);
  const files = [];
  if (existsSync(dir)) {
    for (const f of walk(dir)) if (/\.(ts|tsx)$/.test(f)) files.push(f);
  }
  const refs = new Map(); // table -> Set(columns)
  const fromRe = /\.from\(\s*["'`]([a-z_][a-z0-9_]*)["'`]\s*\)/g;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    let m;
    while ((m = fromRe.exec(src))) {
      const table = m[1];
      if (!refs.has(table)) refs.set(table, new Set());
      // Grab the .select("…") chained to THIS .from(, but stop at the next
      // .from( so a table can't steal a sibling query's columns (the cause of
      // earlier false positives like clients.kind / decision_options.weight).
      let after = src.slice(m.index + m[0].length, m.index + 600);
      const nextFrom = after.search(/\.from\(/);
      if (nextFrom !== -1) after = after.slice(0, nextFrom);
      const sel = after.match(/\.select\(\s*[`"']([\s\S]*?)[`"']/);
      if (sel) {
        for (const col of sel[1].split(",")) {
          const c = col.trim().split(/[\s(:]/)[0].replace(/[^a-z0-9_]/gi, "");
          // real column names are lowercase snake_case; skip junk like "SELECT", "*"
          if (c && !c.includes("*") && /^[a-z][a-z0-9_]*$/.test(c)) refs.get(table).add(c);
        }
      }
    }
  }
  return refs;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────
const appIds = readdirSync(CATALOG_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

const uid = await getUserId(TEST_EMAIL);
if (!uid) {
  console.error(`No auth user for ${TEST_EMAIL}`);
  process.exit(1);
}

// schema map: { table: Set(columns) }
const schema = await loadSchema();
if (!schema) {
  console.error(
    "Could not load schema. Run the one-time setup SQL printed below in the Supabase SQL editor, then re-run:\n",
  );
  console.log(SETUP_SQL);
  process.exit(1);
}
const schemaMap = new Map(Object.entries(schema).map(([t, cols]) => [t, new Set(cols)]));

const problems = [];
const okApps = [];

for (const appId of appIds) {
  const refs = scanApp(appId);
  if (refs.size === 0) continue; // pure-UI app, no DB
  const issues = [];
  let anyRows = 0;

  for (const [table, cols] of refs) {
    if (!schemaMap.has(table)) {
      issues.push(`MISSING TABLE: ${table}`);
      continue;
    }
    const have = schemaMap.get(table);
    for (const c of cols) {
      if (!have.has(c)) issues.push(`MISSING COLUMN: ${table}.${c}`);
    }
    // Row count for this user (service-role; answers "does data exist").
    if (have.has("user_id")) {
      const rr = await rest(`${table}?select=id&user_id=eq.${uid}&limit=1`, {
        headers: { Prefer: "count=exact" },
      });
      const range = rr.headers.get("content-range");
      const n = range ? parseInt(range.split("/")[1], 10) : 0;
      anyRows = Math.max(anyRows, n);
    }
  }

  if (issues.length) problems.push({ appId, issues, rows: anyRows });
  else okApps.push({ appId, rows: anyRows });
}

// ── report ────────────────────────────────────────────────────────────────
console.log(`\n=== XP Boost app audit (user: ${TEST_EMAIL}) ===\n`);
console.log(`Scanned ${appIds.length} catalog apps; ${okApps.length + problems.length} have DB-backed code.\n`);

if (problems.length) {
  console.log(`❌ ${problems.length} app(s) with SCHEMA DRIFT (these render blank/broken):\n`);
  for (const p of problems) {
    console.log(`  ${p.appId}`);
    for (const i of p.issues) console.log(`      - ${i}`);
  }
  console.log("");
}

const empty = okApps.filter((a) => a.rows === 0);
if (empty.length) {
  console.log(`⚠️  ${empty.length} app(s) with NO DATA for this user:\n`);
  for (const a of empty) console.log(`  ${a.appId}`);
  console.log("");
}

const low = okApps.filter((a) => a.rows > 0 && a.rows < 15);
if (low.length) {
  console.log(`▵ ${low.length} app(s) BELOW 15 rows:\n`);
  for (const a of low) console.log(`  ${a.appId} (${a.rows})`);
  console.log("");
}

console.log(
  `✅ ${okApps.filter((a) => a.rows >= 15).length} app(s) healthy with ≥15 rows.\n`,
);

if (problems.length === 0 && empty.length === 0) {
  console.log("All DB-backed apps: schema OK and have data. 🎉");
}

const SETUP_SQL = `
create or replace function public._audit_columns()
returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(t, cols), '{}'::jsonb) from (
    select table_name t, jsonb_agg(column_name) cols
    from information_schema.columns
    where table_schema='public'
    group by table_name
  ) s;
$$;
grant execute on function public._audit_columns() to service_role;
`;
