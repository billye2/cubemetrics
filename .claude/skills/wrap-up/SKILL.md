---
name: wrap-up
description: End-of-session wrap-up for XP Boost — summarize what shipped, update memory + markdown docs, commit, merge to master, deploy, and sign off. Use when the user says "wrap up", "call it a night", "let's close out", or otherwise wants to cleanly end a work session.
---

# Wrap Up

Cleanly close out a work session: capture what happened, persist it to memory and
docs, and ship it. Run the steps **in order** — each gate must pass before the
next. Report honestly at the end; never paper over a skipped or failed step.

## 0. Take stock (read-only)

- `git status` and `git --no-pager log --oneline origin/master..HEAD` — what's
  uncommitted and what's committed-but-unpushed this session.
- Recall the session: which features/fixes landed, which plan items they map to in
  `docs/app-plans/`, and what's still P2/P3 or left open.

If there's genuinely nothing to wrap up (clean tree, nothing unpushed, no session
work), say so and stop — don't manufacture a commit.

## 1. Summarize

Write a short recap for the user:
- **Shipped** — one line per feature/fix, each tied to its plan item.
- **Verification** — test + build status (run them in step 3 if not already green).
- **Still open** — the next punch-list items for a future session.

## 2. Update memory

Persist what changed so the next session starts informed:
- Update `C:\Users\billy\.claude\projects\D--projects-bbs\memory\project_current-state.md`
  — move shipped items out of "still open", add a line for each new feature
  (file paths, migration numbers, no-migration notes). Convert relative dates to
  absolute.
- Update any other memory file the work touched (feedback, reference, etc.).
- Keep `MEMORY.md` index entries accurate — one line per memory, no content.
- Delete or correct any memory line the session proved stale.

## 3. Update markdown docs

- **`docs/app-plans/<id>.md`** — tick `[ ]` → `[x]` for every plan item that
  landed; rewrite "Current state"/"Gaps" if the app's shape changed.
- **`docs/app-plans/_*-template.md`** — same, for shared factory-family upgrades.
- **`docs/database.md`** — add columns/tables if the schema changed.
- **`CLAUDE.md` / `docs/*.md`** — only if conventions or structure changed.

## 4. Gates before committing (non-negotiable)

- `npm test` — green.
- `npm run build` — green.
- **Secret audit** — review the full diff (`git --no-pager diff`); no `.env*`,
  keys, or tokens (public repo).

Never proceed past a red gate. If something fails, fix it or report it and stop.

## 5. Commit

- Stage everything: `git add -A`.
- One honest commit message: what shipped, what's still P2/P3. If on the default
  branch is disallowed by the active role, branch first — but builder ships on
  `master`, so a direct commit is expected here.
- End the message with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## 6. Merge

- If on a **feature branch**: integrate into `master` (fast-forward/merge, or open
  and merge a PR if the user prefers review). Resolve conflicts; re-run step 4 if
  the merge changed code.
- If already on **`master`**: nothing to merge — note it and move on.

## 7. Deploy

- Apply any pending Supabase migration to the remote project (builder autonomy).
- `git push origin master` — this auto-deploys production via the Vercel GitHub App.
- The harness may gate the push to `master` and ask for explicit confirmation
  (production deploy). If it does, surface that to the user and wait for their go-
  ahead rather than working around it.

## 8. Call it a night

Final sign-off:
- Confirm the commit hash(es) pushed and that the deploy is triggered.
- Restate the **still-open** list so the next session has a running start.
- Stop. Don't pick up new work after the sign-off.
