# Feedback (`feedback`)

**Purpose** — System app: the product feedback pipeline — users submit, admins review, approval opens a GitHub issue mentioning `@claude`.

> **Note:** Not a personal tracker. This is plumbing for the product itself, so it's held to a different bar than the personal apps — the goal is a clean submit→review→ship loop, not hero displays and charts. Scope it lightly.

**Current state** — Custom app (`FeedbackView.tsx`) with tabbed UI: **Submit** (category bug/feature/improvement/other + body, optionally tagged with an `app_id` from the header Feedback button), **Mine** (the submitter's own items with a status line: Pending / ✓ Approved + "View issue ↗" link / Not planned), **Board** (a shared list), and an admin-only **Review** queue. Review approve/reject runs through `actions.ts`: `approveFeedbackAction` builds an issue via `buildFeedbackIssue`, calls `createIssue` (tagged `@claude`), and stamps `status`, `github_issue_number`, `github_issue_url`; reject sets `status = rejected`. Uses the service-role admin client behind an `isAdmin` gate. Backed by `user_feedback` (RLS-scoped) + `profiles.handle` for submitter context.

**Gaps** — The submitter loop is *mostly* there (Mine tab already shows status + issue link, better than expected) but is read-only: once submitted, an item can't be **edited or withdrawn**, even while still `new`. There's no acknowledgement when an approved item actually *ships* (merged) — "Approved" is the terminal signal the user sees. No way to upvote or dedupe similar requests. The admin Review queue has no filter/search/bulk actions.

**Plan**

**P1 — submitter control**
- **Edit / withdraw while `new`** — let the submitter fix wording or delete their own feedback before an admin acts on it (new `updateMyFeedbackAction` / `withdrawMyFeedbackAction`, guarded to `status = 'new'` and own `user_id`). The Mine tab already shows status — add these affordances there.

**P2 — closing the loop**
- **"Shipped" changelog** — a public list of approved→merged items, so users see their feedback land. Requires detecting merge (a `shipped` status or reading the linked issue/PR state).
- **Upvote / dedupe** — let users upvote Board items to surface demand and merge duplicates.

**P3 — admin ergonomics**
- **Review queue filters + search** (by category, app, date) and **bulk approve/reject** for triage.

**Data** — Mostly present (`status`, `app_id`, `github_issue_number`, `github_issue_url`). Edit/withdraw need no schema. A "shipped" state means widening `status` (add `shipped`) or tracking the linked issue's merge. Upvoting needs a `feedback_votes (id, feedback_id, user_id, created_at)` table with a unique `(feedback_id, user_id)` and the standard RLS pair.

**Verdict** — **S.** System app — deliberately lighter scope than the personal trackers. Highest-impact change: **let submitters edit/withdraw their own `new` feedback** (status visibility already exists).
