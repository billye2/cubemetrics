# Decisions (`decisionmatrix`)

**Purpose** — Make hard choices rationally: score options against weighted criteria and pick a winner.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Decision"`). A title + a textarea. A weighted decision matrix is fundamentally a 2-D grid of numbers — a single text blob cannot represent or compute it.

**Gaps**
- No options, no criteria, no weights, no scoring — the entire point of a decision *matrix* is missing.
- No computed recommendation; the user does the math in their head.
- No record of the actual decision made or whether it held up.

**Plan** — **GRADUATE** to a custom app (`ui: "modern"`, add `page.tsx` + `actions.ts`).
- **P1** — Create a decision with a question. Add **options** (rows) and **criteria** (columns) each with a **weight** (1–5). Enter a **raw score** (1–10) per option×criterion in a phone-friendly grid (one criterion at a time on small screens). Compute **weighted score per option** = Σ(score × weight), normalized; highlight the **recommended winner**.
- **P2** — Record the **final decision** (which option you actually chose — may differ from the computed winner), a **rationale** note, and a **revisit date**. List view of past decisions with their winner + chosen option.
- **P3** — **Revisit nudge** when the revisit date passes ("Was this the right call?") with an outcome rating. Duplicate a decision as a template. Simple bar of each option's total score.

**Data** — New tables:
- `decisions` (`id, user_id, question, status, chosen_option_id, rationale, revisit_at, created_at`)
- `decision_options` (`id, decision_id, label, sort`)
- `decision_criteria` (`id, decision_id, label, weight, sort`)
- `decision_scores` (`id, decision_id, option_id, criterion_id, score`)

Standard RLS pair on each (owner FOR ALL + SysOp SELECT), scoped via `decision_id → decisions.user_id`.

**Verdict** — **GRADUATE.** A matrix needs real structure + computation. Effort **M/L**.
