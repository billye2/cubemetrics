export const meta = {
  name: 'parallel-build',
  description: 'Claim open app-build issues, build each app in an isolated worktree lane, then integrate the green lanes and ship',
  whenToUse: 'Run a parallel build pass over the XP Boost backlog. Seed the queue first with scripts/seed-backlog-issues.mjs.',
  phases: [
    { title: 'Dispatch', detail: 'claim up to N open app-build issues' },
    { title: 'Build', detail: 'one isolated builder lane per app' },
    { title: 'Integrate', detail: 'merge green lanes, regenerate catalog, union build, push master' },
  ],
}

// args (optional): { count?: number, apps?: string[] }
//   count — how many lanes to run when claiming from the issue queue (default 3)
//   apps  — explicit app ids to build, bypassing the issue queue entirely
const COUNT = (args && args.count) || 3
const FIXED = args && Array.isArray(args.apps) && args.apps.length ? args.apps : null

// ── Phase 1: Dispatch ───────────────────────────────────────────────────────
// Claim work atomically via GitHub issue labels so no two lanes pick the same
// app (Decision 1 / Option B in docs/agent-orchestration.md).
phase('Dispatch')
let claims
if (FIXED) {
  log(`Dispatch skipped — building ${FIXED.length} app(s) from args: ${FIXED.join(', ')}`)
  claims = FIXED.map((app) => ({ app, issue: null }))
} else {
  const dispatch = await agent(
    `You are the DISPATCHER for the XP Boost parallel build (docs/agent-orchestration.md, Decision 1).
     1. List available work: gh issue list --label "app-build" --label "agent:available" --state open --json number,title --limit ${COUNT * 3}
        Each title is "[app-build] <appId>".
     2. Pick up to ${COUNT} of them.
     3. CLAIM each picked issue atomically before returning it:
          gh issue edit <n> --add-label "agent:in-progress" --remove-label "agent:available"
          gh issue comment <n> --body "Claimed by parallel-build."
     4. Return only the issues you successfully claimed. If none are available, return an empty list.`,
    {
      label: 'dispatch',
      phase: 'Dispatch',
      schema: {
        type: 'object',
        required: ['claims'],
        properties: {
          claims: {
            type: 'array',
            items: {
              type: 'object',
              required: ['app', 'issue'],
              properties: { app: { type: 'string' }, issue: { type: 'number' } },
            },
          },
        },
      },
    },
  )
  claims = dispatch.claims || []
}

if (!claims.length) {
  log('Nothing claimed — the queue is empty. (Seed it with scripts/seed-backlog-issues.mjs.)')
  return { built: [], integrated: false, note: 'queue empty' }
}
log(`Building ${claims.length} app(s): ${claims.map((c) => c.app).join(', ')}`)

// ── Phase 2: Build (fan-out) ─────────────────────────────────────────────────
// One isolated worktree lane per app. Lanes own disjoint islands, so they can
// run fully in parallel without overwriting each other. A lane that throws is
// captured as ok:false and simply not integrated.
phase('Build')
const built = await parallel(
  claims.map((c) => () =>
    agent(
      `You are a BUILDER lane in an isolated git worktree (.claude/roles/builder.md). Build the "${c.app}" app for XP Boost.
       - Follow docs/app-plans/${c.app}.md; do P1 first.
       - Own ONLY this app's island: src/app/app/${c.app}/ (if a custom page), src/lib/modern/catalog/apps/${c.app}.json, docs/app-plans/${c.app}.md. Never touch another app's files.
       - Catalog: edit ONLY catalog/apps/${c.app}.json, then run \`npm run build:catalog\`. NEVER edit catalog/_generated.ts.
       - New migrations use a timestamp name: YYYYMMDDTHHMM_<slug>.sql. Put any schema delta in your plan file, not database.md.
       - GATE before finishing: \`npm test\` AND \`npm run build\` must be green; audit your diff for secrets; tick [ ]->[x] in the plan.
       - Commit on branch claude/${c.app}-build, push it, and open a PR${c.issue ? ` that closes #${c.issue}` : ''} via \`gh pr create\`. Do NOT merge it — the integrator does that.
       Report the branch, PR url, what shipped (which P-levels), and the test+build result.`,
      {
        label: `build:${c.app}`,
        phase: 'Build',
        isolation: 'worktree',
        schema: {
          type: 'object',
          required: ['app', 'ok'],
          properties: {
            app: { type: 'string' },
            ok: { type: 'boolean' },
            branch: { type: 'string' },
            pr: { type: 'string' },
            shipped: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    )
      .then((r) => ({ ...r, app: c.app, issue: c.issue }))
      .catch(() => ({ app: c.app, issue: c.issue, ok: false, notes: 'lane threw before reporting' })),
  ),
)

const green = built.filter((b) => b && b.ok)
const failed = built.filter((b) => !b || !b.ok)
failed.forEach((f) => log(`Lane NOT integrating: ${f.app} — ${f.notes || 'failed gate'} (left agent:in-progress for triage)`))
if (!green.length) {
  return { built, integrated: false, note: 'no green lanes to integrate' }
}

// ── Phase 3: Integrate (fan-in barrier) ──────────────────────────────────────
// A single serial agent owns the seam files and the ONE authoritative build
// across the union — the gate that catches breakage only visible once
// independently-green lanes are combined. Only this step pushes master.
phase('Integrate')
const lanes = green
  .map((g) => `- ${g.app}: branch ${g.branch || '(unknown)'} PR ${g.pr || '(unknown)'}${g.issue ? ` closes #${g.issue}` : ''}`)
  .join('\n   ')
const integration = await agent(
  `You are the INTEGRATOR (.claude/roles/integrator.md). Land these green builder PRs onto master TOGETHER:
   ${lanes}
   Steps:
   1. Merge each branch into a fresh integration of master. Lanes own disjoint files, so conflicts should be rare; resolve any that occur.
   2. Run \`npm run build:catalog\` to reassemble catalog/_generated.ts from every lane's catalog/apps/*.json.
   3. Fold each lane's schema delta (from its docs/app-plans/<id>.md) into docs/database.md; clear merged rows from _status.md "Active claims".
   4. UNION GATE — run \`npm test\` AND \`npm run build\` across the merged tree; both must be green. Audit the combined diff for secrets (public repo).
   5. Only if green + clean: push to master (auto-deploys), apply any new migrations to remote Supabase, close the linked issues, and delete the merged branches/worktrees.
   Do NOT push a union you couldn't verify, and do NOT land a lane that fails to merge cleanly — bounce it back instead.
   Report what landed, the union test/build result, and anything bounced.`,
  {
    label: 'integrate',
    phase: 'Integrate',
    schema: {
      type: 'object',
      required: ['pushed'],
      properties: {
        pushed: { type: 'boolean' },
        landed: { type: 'array', items: { type: 'string' } },
        unionTests: { type: 'string' },
        unionBuild: { type: 'string' },
        bounced: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
  },
)

log(integration.pushed ? `Shipped: ${(integration.landed || []).join(', ')}` : 'Integration did not push — see notes.')
return { built, integrated: integration.pushed, integration }
