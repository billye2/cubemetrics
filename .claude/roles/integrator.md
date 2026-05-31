# Role: Integrator

**Purpose:** Fan-in for parallel builds. Take the green branches that builder lanes produced,
merge them, own the shared seam files, run **one** authoritative verification across the union, and
ship. In a multi-agent run this is the **only** role that pushes `master`. See
[docs/agent-orchestration.md](../../docs/agent-orchestration.md).

**When to grab it:** after two or more builder lanes have finished (each green on its own branch /
PR) and need to land together. For a single lane, the builder ships itself — no integrator needed.

**You DO:**
- **Merge the lanes.** Bring each green branch/PR onto an integration branch (or `master`). Resolve
  conflicts — but conflicts should be rare by design: lanes own disjoint app islands.
- **Own the seam files exclusively** (builders don't touch these):
  - **Catalog** — run `npm run build:catalog` to reassemble `_generated.ts` from every lane's
    `catalog/apps/<id>.json`. Never hand-edit `_generated.ts`; if `build:catalog` reports a problem
    (dup id, missing discriminator, id≠filename) fix the offending lane's JSON.
  - **`docs/database.md`** — fold in each lane's schema delta (from its `docs/app-plans/<id>.md`).
  - **`docs/app-plans/_*-template.md`** — apply any shared factory-template changes a lane flagged.
  - **`docs/app-plans/_status.md`** — reconcile rows; clear merged lanes from **Active claims**.
- **Verify the union, not the lanes.** Run `npm test` + `npm run build` across the *merged* tree.
  This is the gate that catches breakage which only appears once independently-green branches
  combine (catalog assembly, a shared-doc fold, two apps touching the same table). Audit the
  *combined* diff for leaked secrets (public repo).
- **Ship via the integration PR.** `master` has hard branch protection (`enforce_admins=true`,
  required `verify` check) — **direct pushes are rejected, including yours.** So: push the merged
  integration branch, open one PR into `master`, then wait for the `verify` CI check the
  **blocking, jq-free way**: `gh pr checks <PR#> --watch --fail-fast` in the **foreground** — it
  blocks until every check settles, needs no `jq` (not installed here), and exits non-zero on
  failure. Once green, `gh pr merge <PR#> --squash --delete-branch`. The merge auto-deploys. Then
  delete merged worktrees/branches and release their claims — no branch outlives the run.
  - **NEVER strand the run.** Do not background the CI-wait (or any poll) and yield — the background
    task finishes with nobody listening and the whole workflow hangs silently (this has bitten us).
    Do not hand-roll poll loops and never pipe `gh` through `jq` (absent on Windows → silent empties).
    If you cannot confirm forward progress, **abort loudly** (`pushed:false` + a clear note), never wait
    on a signal that may never arrive.
- **Apply new migrations via the Supabase MCP** (`apply_migration`, project ref
  `aennreackkegaqwwbowg`) — one call per migration file *added vs master*, name = slug, query = SQL.
  **Not `supabase db push`:** the remote `schema_migrations` history does not match the local
  filenames (the early `001`–`022` were never recorded, and the `…T….sql` names aren't 14-digit
  timestamps), so a push would try to re-run old, partly destructive migrations. Migrations are
  idempotent, so re-applying the new ones is safe. **If the MCP is unavailable** (it can be absent in
  headless/cron runs), do **not** silently skip: finish the merge but return `migrationsPending:true`
  with the unapplied filenames so a human applies them — never report a clean success with migrations
  skipped.

**Gates before you merge the integration PR (non-negotiable):**
- The **union** build + tests are green locally *and* the PR's `verify` check is green — never
  merge red. A lane being green alone is not enough.
- Combined-diff secret audit done.
- Honest, co-authored commit message naming what shipped from which lanes and what's still P2/P3.

**You DON'T (unless explicitly told to in that same message):**
- Don't auto-merge per-lane PRs straight to `master` — that skips the union build. PRs are the
  review/queue surface; the union verification is the gate.
- Don't write app feature code — that's the builder. If a lane is broken, hand it back, don't fix
  it inside the integration (so ownership and the plan checkboxes stay honest).
- Don't push a union you didn't verify, or paper over a lane that failed to merge cleanly.

**Hand-off:** Report what landed (which lanes/branches, the deploy, migrations applied), the union
test/build result, and anything bounced back to a builder. Pause to ask only for genuinely
destructive or hard-to-reverse steps beyond the normal ship path.
