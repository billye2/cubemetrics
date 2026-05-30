# Decisions (`decisionmatrix`)

**Purpose** — Make hard choices rationally: score options against weighted criteria and pick a winner.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Decision"`). A title + a textarea. A weighted decision matrix is fundamentally a 2-D grid of numbers — a single text blob cannot represent or compute it.

**Gaps**
- No options, no criteria, no weights, no scoring — the entire point of a decision *matrix* is missing.
- No computed recommendation; the user does the math in their head.
- No record of the actual decision made or whether it held up.

**Plan** — **GRADUATE** to a custom app (`ui: "modern"`, add `page.tsx` + `actions.ts`). **Shipped (P1–P3)** on branch `claude/decisionmatrix-build`.
- [x] **P1** — Create a decision with a question. Add **options** (rows) and **criteria** (columns) each with a **weight** (1–5). Enter a **raw score** (1–10) per option×criterion in a phone-friendly grid (one criterion at a time on small screens via prev/next pager). Compute **weighted score per option** = Σ(score × weight), normalized to a %; highlight the **recommended winner** ("Pick" badge; null on a tie so we never claim a false winner). A missing cell counts as the neutral midpoint (5).
- [x] **P2** — Record the **final decision** (which option you actually chose — may differ from the computed winner; flags when you go against the recommendation), a **rationale** note, and a **revisit date**. List view (collapsible cards) of past decisions showing their lead + chosen option.
- [x] **P3** — **Revisit nudge** when the revisit date passes ("Was this the right call?") with a good/mixed/wrong outcome rating. **Duplicate** a decision (question + options + criteria) as a template. Horizontal bar per option of its total score.

**Data** — New tables (migration `src/supabase/migrations/20260530T0800_decisions.sql`, applied as schema delta below — fold into `docs/database.md` at fan-in):
- `decisions` (`id, user_id, question, status['open'|'decided'|'revisit'], chosen_option_id, rationale, revisit_at DATE, outcome, created_at`)
- `decision_options` (`id, user_id, decision_id, label, sort_order, created_at`)
- `decision_criteria` (`id, user_id, decision_id, label, weight INT 1–5, sort_order, created_at`)
- `decision_scores` (`id, user_id, decision_id, option_id, criterion_id, score INT 1–10, created_at`, `UNIQUE(option_id, criterion_id)`)

Each child carries `user_id` directly (simple RLS predicate) and cascades on `decisions` delete; scores also cascade on option/criterion delete. Standard RLS pair on each table (owner `FOR ALL` USING/​WITH CHECK `auth.uid() = user_id` + SysOp `FOR SELECT`). Score upsert uses `onConflict: option_id,criterion_id`. Pure matrix math + clamps live in `src/app/app/decisionmatrix/lib.ts` (unit-tested in `tests/unit/decisionmatrix-lib.test.ts`).

> **Schema delta (apply to remote Supabase at integration):** run `20260530T0800_decisions.sql`. Adds four tables above with RLS; no changes to existing tables.

**Verdict** — **GRADUATE.** A matrix needs real structure + computation. Effort **M/L**. **Done.**
