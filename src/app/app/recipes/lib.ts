// Pure, testable recipe helpers. The interesting logic is the servings scaler:
// rescale every ingredient quantity by target/base servings, formatting the
// result so "0.5" reads as "1/2" and whole numbers stay clean.

export interface IngredientRow {
  id: number;
  recipe_id: number;
  qty: number | null;
  unit: string;
  item: string;
  sort: number;
}

export interface StepRow {
  id: number;
  recipe_id: number;
  step_no: number;
  text: string;
}

export interface RecipeRow {
  id: number;
  user_id: string;
  name: string;
  servings: number | null;
  prep_min: number | null;
  cook_min: number | null;
  tags: string[] | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface Ingredient {
  id: number;
  qty: number | null;
  unit: string;
  item: string;
  sort: number;
}

export interface Step {
  id: number;
  stepNo: number;
  text: string;
}

export interface Recipe {
  id: number;
  name: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
  ingredients: Ingredient[];
  steps: Step[];
}

export function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    qty: row.qty === null ? null : Number(row.qty),
    unit: row.unit ?? "",
    item: row.item,
    sort: row.sort ?? 0,
  };
}

export function toStep(row: StepRow): Step {
  return { id: row.id, stepNo: row.step_no ?? 0, text: row.text };
}

/** Assemble a recipe view model from its rows. Children are sorted. */
export function toRecipe(
  row: RecipeRow,
  ingredients: IngredientRow[],
  steps: StepRow[],
): Recipe {
  return {
    id: row.id,
    name: row.name,
    servings: row.servings === null ? null : Number(row.servings),
    prepMin: row.prep_min,
    cookMin: row.cook_min,
    tags: row.tags ?? [],
    notes: row.notes,
    createdAt: row.created_at,
    ingredients: ingredients
      .map(toIngredient)
      .sort((a, b) => a.sort - b.sort || a.id - b.id),
    steps: steps.map(toStep).sort((a, b) => a.stepNo - b.stepNo || a.id - b.id),
  };
}

/** Scale a single quantity by a factor, rounded to avoid float noise. */
export function scaleQty(qty: number | null, factor: number): number | null {
  if (qty === null) return null;
  const scaled = qty * factor;
  // Round to 3 decimals, then strip trailing float noise.
  return Math.round(scaled * 1000) / 1000;
}

/**
 * Scaling factor for moving a recipe from `base` servings to `target`.
 * Falls back to 1 (no scaling) when either side is missing or non-positive.
 */
export function scaleFactor(base: number | null, target: number): number {
  if (!base || base <= 0 || !target || target <= 0) return 1;
  return target / base;
}

const VULGAR: Record<string, string> = {
  "0.25": "¼",
  "0.5": "½",
  "0.75": "¾",
  "0.333": "⅓",
  "0.667": "⅔",
};

/**
 * Human-friendly quantity: whole numbers stay bare, common fractions become
 * vulgar fractions ("1.5" → "1½", "0.5" → "½"), everything else trims to ~2dp.
 */
export function formatQty(qty: number | null): string {
  if (qty === null) return "";
  if (qty === 0) return "0";
  const sign = qty < 0 ? "-" : "";
  const abs = Math.abs(qty);
  const whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 1000) / 1000;
  const fracKey = frac.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const vulgar = VULGAR[fracKey] ?? (frac === 0.333 ? "⅓" : frac === 0.667 ? "⅔" : null);
  if (vulgar) {
    return sign + (whole > 0 ? `${whole}${vulgar}` : vulgar);
  }
  if (frac === 0) return sign + String(whole);
  // Trim to at most 2 decimals, drop trailing zeros.
  const trimmed = parseFloat(abs.toFixed(2));
  return sign + String(trimmed);
}

/** "1 hr 20 min" / "45 min" / null when no time given. */
export function formatTime(min: number | null): string | null {
  if (min === null || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** Total active time = prep + cook (nulls treated as 0; null if both missing). */
export function totalTime(prepMin: number | null, cookMin: number | null): number | null {
  if (prepMin === null && cookMin === null) return null;
  return (prepMin ?? 0) + (cookMin ?? 0);
}

/**
 * Free-text search across a recipe's name, tags, and ingredient items.
 * Case-insensitive; empty query matches everything.
 */
export function matchesQuery(recipe: Recipe, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (recipe.name.toLowerCase().includes(q)) return true;
  if (recipe.tags.some((t) => t.toLowerCase().includes(q))) return true;
  if (recipe.ingredients.some((i) => i.item.toLowerCase().includes(q))) return true;
  return false;
}

/** Parse a comma/space-tolerant tag string into a clean, de-duped list. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim().toLowerCase();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t.slice(0, 30));
    }
  }
  return out.slice(0, 12);
}
