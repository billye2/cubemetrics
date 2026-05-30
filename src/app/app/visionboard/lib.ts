// Pure, testable Vision Board logic. A vision card is an aspiration — either a
// quote/affirmation (kind="quote") or an image (kind="image"). There is no
// "completed" concept: a board should inspire, not pressure. Cards group by
// life area (section); each area gets a color-coded chip per the design system.

export type CardKind = "quote" | "image";

export interface VisionCardRow {
  id: number;
  kind: string;
  text: string | null;
  image_url: string | null;
  section: string | null;
  position: number;
  created_at: string;
}

export interface VisionCard {
  id: number;
  kind: CardKind;
  text: string | null;
  imageUrl: string | null;
  section: string | null;
  position: number;
  createdAt: string;
}

// Life areas — the curated set offered in the picker. `section` may also hold a
// free-form value (older rows / custom), which falls back to a neutral chip.
export interface LifeArea {
  id: string;
  label: string;
  /** Tailwind classes for the chip (text + subtle bg + ring). */
  chip: string;
  /** Accent border + glow for quote cards in this area. */
  accent: string;
}

export const LIFE_AREAS: LifeArea[] = [
  {
    id: "health",
    label: "Health",
    chip: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
    accent: "border-emerald-500/40",
  },
  {
    id: "career",
    label: "Career",
    chip: "text-cyan-300 bg-cyan-500/10 ring-cyan-500/30",
    accent: "border-cyan-500/40",
  },
  {
    id: "relationships",
    label: "Relationships",
    chip: "text-rose-300 bg-rose-500/10 ring-rose-500/30",
    accent: "border-rose-500/40",
  },
  {
    id: "travel",
    label: "Travel",
    chip: "text-sky-300 bg-sky-500/10 ring-sky-500/30",
    accent: "border-sky-500/40",
  },
  {
    id: "money",
    label: "Money",
    chip: "text-amber-300 bg-amber-500/10 ring-amber-500/30",
    accent: "border-amber-500/40",
  },
  {
    id: "growth",
    label: "Growth",
    chip: "text-violet-300 bg-violet-500/10 ring-violet-500/30",
    accent: "border-violet-500/40",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    chip: "text-fuchsia-300 bg-fuchsia-500/10 ring-fuchsia-500/30",
    accent: "border-fuchsia-500/40",
  },
];

const NEUTRAL: LifeArea = {
  id: "",
  label: "Other",
  chip: "text-zinc-300 bg-zinc-700/30 ring-zinc-600/40",
  accent: "border-zinc-700",
};

const AREA_BY_ID = new Map(LIFE_AREAS.map((a) => [a.id, a]));

/** Resolve a stored section value to its chip styling; unknown → neutral. */
export function areaFor(section: string | null | undefined): LifeArea {
  if (!section) return NEUTRAL;
  return AREA_BY_ID.get(section) ?? { ...NEUTRAL, id: section, label: section };
}

export function normalizeKind(kind: string): CardKind {
  return kind === "image" ? "image" : "quote";
}

/** Map a DB row to the view model. */
export function toCard(row: VisionCardRow): VisionCard {
  return {
    id: row.id,
    kind: normalizeKind(row.kind),
    text: row.text,
    imageUrl: row.image_url,
    section: row.section,
    position: row.position,
    createdAt: row.created_at,
  };
}

/** Sort by manual position, then newest first as a tiebreak. */
export function sortCards(cards: VisionCard[]): VisionCard[] {
  return [...cards].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Filter to a single life area; an empty/undefined filter passes everything. */
export function filterByArea(cards: VisionCard[], areaId: string | null): VisionCard[] {
  if (!areaId) return cards;
  return cards.filter((c) => (c.section ?? "") === areaId);
}

/** The set of life areas actually in use, in LIFE_AREAS order, for filter chips. */
export function activeAreas(cards: VisionCard[]): LifeArea[] {
  const used = new Set(cards.map((c) => c.section ?? ""));
  return LIFE_AREAS.filter((a) => used.has(a.id));
}
