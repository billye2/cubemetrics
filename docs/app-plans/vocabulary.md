# Vocabulary (`vocabulary`)

**Purpose** — Build vocabulary: collect words with meanings and review them until mastered.

**Current state** — Generic ChecklistView, `listType: "vocab"`, itemLabel "Word". A flat list of words you check off. A checkbox is the wrong affordance — a word needs a definition and example, and learning means *reviewing*, not ticking a box once.

**Gaps**
- No definition or example sentence — just a bare word.
- No review/quiz mode; no notion of mastery.
- "Completing" a word doesn't model learning, which is repeated recall.

**Plan**
- [x] **P1 (graduate)** — Custom page. Each entry = word + definition + optional example. List view shows the word with definition revealed on tap. Hero: count due for review today. Quick-entry: word + definition + example fields.
- [x] **P2** — **Review mode** (flashcard-like): show the word, tap to reveal the definition, then self-rate. Track mastery with a lightweight spaced-repetition schedule (knew it → longer interval; didn't → soon). Due-today count drives the review session. Stats: total words, mastered, due today. (Accuracy stat deferred — would need a per-review log table.)
- [ ] **P3** — Tags/categories (e.g., by language or topic), search/filter for long lists, optional pronunciation note. Could **share a card/review model with `flashcards`** (front=word, back=definition) — consider a common reviewable schema.

**Data** — New table `vocab_words` (graduate off `checklists`): `id, user_id, word, definition, example TEXT, ease, interval INT, due_date DATE, reps INT, created_at`. Mirrors the flashcards schema so the SR engine is shared. Standard RLS pair.

**Shipped (P1 + P2).** Migration `src/supabase/migrations/20260530T0533_vocab_words.sql` creates `public.vocab_words`:

```sql
CREATE TABLE public.vocab_words (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT,
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: "Users access own rows" FOR ALL USING (auth.uid() = user_id) WITH CHECK (...)
-- INDEX vocab_words_user_due_idx ON (user_id, due_date)
```

Catalog entry flipped from `ui: checklist` to `ui: "modern"` (custom page at `src/app/app/vocabulary/`). The SM-2-lite scheduler in `actions.ts` is copied from flashcards verbatim (the intended shared engine); a future refactor could hoist it into a shared lib once P3 unifies the schemas. **Integrator: apply the migration to remote Supabase.**

**Verdict** — **GRADUATE** — needs definition/example fields + a review mode; a checkbox is wrong. Share the SR model with `flashcards`. Effort **M**.
