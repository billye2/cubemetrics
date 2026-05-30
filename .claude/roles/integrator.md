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
- **Ship.** Once the union is green and clean, commit and push to `master` (auto-deploys) and apply
  any new migrations to the remote Supabase project. Then delete merged worktrees/branches and
  release their claims — no branch outlives the run.

**Gates before you push (non-negotiable):**
- The **union** build + tests are green — never push red. A lane being green alone is not enough.
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
