#!/usr/bin/env node
// Seed the parallel-build queue: one GitHub issue per open backlog app, labeled
// `app-build` + `agent:available`, so builder lanes can claim work atomically
// (Decision 1 / Option B in docs/agent-orchestration.md).
//
// SAFE BY DEFAULT — dry run. It prints what it WOULD create and changes nothing
// unless you pass --create. It is idempotent: apps that already have an open
// `[app-build]` issue are skipped.
//
//   node scripts/seed-backlog-issues.mjs                 # dry run — list candidates
//   node scripts/seed-backlog-issues.mjs --create a b c  # create issues for apps a,b,c
//   node scripts/seed-backlog-issues.mjs --create --all  # create for EVERY open candidate
//
// "Open candidate" = a plan file in docs/app-plans/ that is NOT a meta file
// (_*.md), NOT README, and NOT archived under finished/ (finished = shipped).
import { readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const argv = process.argv.slice(2);
const CREATE = argv.includes("--create");
const ALL = argv.includes("--all");
const ONLY = argv.filter((a) => !a.startsWith("--")); // explicit app ids

const plansDir = join(process.cwd(), "docs/app-plans");
const candidates = readdirSync(plansDir)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md")
  .map((f) => f.replace(/\.md$/, ""))
  .filter((id) => !ALL && ONLY.length ? ONLY.includes(id) : true)
  .sort();

if (ONLY.length) {
  const missing = ONLY.filter((id) => !existsSync(join(plansDir, `${id}.md`)));
  if (missing.length) {
    console.error(`No plan file for: ${missing.join(", ")} (expected docs/app-plans/<id>.md)`);
    process.exit(1);
  }
}

// Existing open [app-build] issues → skip those apps (idempotent).
let openTitles = new Set();
try {
  const json = execSync(`gh issue list --label "app-build" --state open --json title --limit 500`, { encoding: "utf8" });
  openTitles = new Set(JSON.parse(json).map((i) => i.title));
} catch (e) {
  console.error("Could not read existing issues via gh — is gh authenticated? Aborting.");
  process.exit(1);
}

const title = (id) => `[app-build] ${id}`;
const todo = candidates.filter((id) => !openTitles.has(title(id)));
const already = candidates.filter((id) => openTitles.has(title(id)));

console.log(`Candidates: ${candidates.length}  |  already queued: ${already.length}  |  to create: ${todo.length}`);
if (already.length) console.log(`  skipping (already have an open issue): ${already.join(", ")}`);
if (!todo.length) { console.log("Nothing to create."); process.exit(0); }

if (!CREATE) {
  console.log(`\nDRY RUN — would create ${todo.length} issue(s):`);
  todo.forEach((id) => console.log(`  • ${title(id)}`));
  console.log(`\nRe-run with --create (optionally a list of app ids, or --all) to actually create them.`);
  process.exit(0);
}

if (!ALL && !ONLY.length) {
  console.error("Refusing to create for ALL candidates without --all (safety). Pass app ids or --all.");
  process.exit(1);
}

for (const id of todo) {
  const body = [
    `Build out the **${id}** app to its plan.`,
    ``,
    `**Plan:** \`docs/app-plans/${id}.md\` — do P1 first.`,
    `**How:** follow \`.claude/roles/builder.md\` (own only this app's island; catalog via \`catalog/apps/${id}.json\` + \`npm run build:catalog\`; gates green before the PR).`,
    ``,
    `A builder lane claims this by swapping \`agent:available\` → \`agent:in-progress\` and self-assigning. See \`docs/agent-orchestration.md\`.`,
  ].join("\n");
  const cmd = `gh issue create --title ${JSON.stringify(title(id))} --label "app-build" --label "agent:available" --body ${JSON.stringify(body)}`;
  const url = execSync(cmd, { encoding: "utf8" }).trim();
  console.log(`created ${title(id)} → ${url}`);
}
console.log(`\nDone — created ${todo.length} issue(s).`);
