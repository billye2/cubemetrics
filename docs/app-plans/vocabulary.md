# Vocabulary (`vocabulary`)

**Purpose** — Build vocabulary: collect words with meanings and review them until mastered.

**Current state** — Generic ChecklistView, `listType: "vocab"`, itemLabel "Word". A flat list of words you check off. A checkbox is the wrong affordance — a word needs a definition and example, and learning means *reviewing*, not ticking a box once.

**Gaps**
- No definition or example sentence — just a bare word.
- No review/quiz mode; no notion of mastery.
- "Completing" a word doesn't model learning, which is repeated recall.

**Plan**
- **P1 (graduate)** — Custom page. Each entry = word + definition + optional example. List view shows the word with definition revealed on tap. Hero: count due for review today. Quick-entry: word + definition fields.
- **P2** — **Review mode** (flashcard-like): show the word, tap to reveal the definition, then self-rate. Track mastery with a lightweight spaced-repetition schedule (knew it → longer interval; didn't → soon). Due-today count drives the review session. Stats: total words, mastered, due today, accuracy.
- **P3** — Tags/categories (e.g., by language or topic), search/filter for long lists, optional pronunciation note. Could **share a card/review model with `flashcards`** (front=word, back=definition) — consider a common reviewable schema.

**Data** — New table `vocab_words` (graduate off `checklists`): `id, user_id, word, definition, example TEXT, ease, interval INT, due_date DATE, reps INT, created_at`. Mirrors the flashcards schema so the SR engine is shared. Standard RLS pair.

**Verdict** — **GRADUATE** — needs definition/example fields + a review mode; a checkbox is wrong. Share the SR model with `flashcards`. Effort **M**.
