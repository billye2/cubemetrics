# Flashcards (`flashcards`)

**Purpose** — Study with flashcards and a spaced-repetition review session.

**Current state** — Generic ChecklistView, `listType: "flashcard"`, itemLabel "Card". A flat list of card titles you check off — the clearest mismatch of all. A flashcard has a front and a back, lives in a deck, and is *reviewed repeatedly*, not checked off once.

**Gaps**
- No front/back — just a single title.
- No decks/grouping.
- No review session, no scheduling, no recall rating, no accuracy stats.

**Plan**
- **P1 (graduate)** — Custom page. Each card = front + back, belonging to a **deck**. List/manage view per deck. Hero: **due-today** count across decks. Quick-entry: front + back + deck.
- **P2** — **Review session** (SM-2-lite): show front → tap to flip → rate **Again / Hard / Good / Easy**, which sets the next-due interval (Again = soon, Easy = much later) via ease + interval. Session pulls cards due today. Stats strip: total cards, due today, reviewed today, accuracy.
- **P3** — Per-deck stats and a retention/accuracy chart over time; deck management (rename/archive); shared review engine reused by `vocabulary` (word=front, definition=back). Optional cram mode (review a whole deck ignoring schedule).

**Data** — New table `flashcards` (graduate off `checklists`): `id, user_id, front, back, deck TEXT, ease FLOAT DEFAULT 2.5, interval INT DEFAULT 0, due_date DATE, reps INT DEFAULT 0, created_at`. The SR fields (ease/interval/due_date/reps) drive scheduling and are shared with `vocabulary`. Standard RLS pair.

**Verdict** — **GRADUATE** — the canonical example. Front/back cards, decks, and an SM-2-lite review session. Effort **M/L**.
