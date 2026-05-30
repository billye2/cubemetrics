// Pure, testable meal-planner helpers. The interesting logic is the week math
// (Monday-anchored 7-day windows, today highlighting) and the grocery
// aggregation that rolls up every linked recipe's ingredients across a week
// into a de-duplicated shopping list.

export type Slot = "breakfast" | "lunch" | "dinner";

export const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

export const SLOT_LABEL: Record<Slot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const VALID_SLOT = new Set<string>(SLOTS);

/** Normalize a raw value to a valid slot, or null. */
export function normalizeSlot(value: string | null | undefined): Slot | null {
  return value && VALID_SLOT.has(value) ? (value as Slot) : null;
}

export interface MealRow {
  id: number;
  user_id: string;
  date: string; // YYYY-MM-DD
  slot: string;
  meal: string;
  recipe_id: number | null;
  created_at: string;
}

export interface Meal {
  id: number;
  date: string;
  slot: Slot;
  meal: string;
  recipeId: number | null;
}

export function toMeal(row: MealRow): Meal | null {
  const slot = normalizeSlot(row.slot);
  if (!slot) return null;
  return {
    id: row.id,
    date: row.date,
    slot,
    meal: row.meal,
    recipeId: row.recipe_id,
  };
}

/* ───────────────────────── Week math (Monday-anchored) ───────────────────────── */

function dateFromYmd(s: string): Date {
  return new Date(s + "T00:00:00");
}

export function ymdFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(s: string, n: number): string {
  const d = dateFromYmd(s);
  d.setDate(d.getDate() + n);
  return ymdFromDate(d);
}

/** The Monday on/before the given date (weeks start Monday). */
export function weekStart(s: string): string {
  const d = dateFromYmd(s);
  const dow = d.getDay(); // 0 = Sun … 6 = Sat
  const back = (dow + 6) % 7; // days since Monday
  return addDays(s, -back);
}

/** The 7 YYYY-MM-DD dates of the week containing `s`, Monday → Sunday. */
export function weekDates(s: string): string[] {
  const mon = weekStart(s);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Mon" for a YYYY-MM-DD date (Monday-indexed names, weekend-safe). */
export function weekdayShort(s: string): string {
  const dow = dateFromYmd(s).getDay();
  return WEEKDAY_SHORT[(dow + 6) % 7];
}

export function weekdayLong(s: string): string {
  const dow = dateFromYmd(s).getDay();
  return WEEKDAY_LONG[(dow + 6) % 7];
}

/** "May 12" day label. */
export function dayLabel(s: string): string {
  const d = dateFromYmd(s);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "May 12 – 18" range label for a week starting at `monday`. */
export function weekRangeLabel(monday: string): string {
  const start = dateFromYmd(monday);
  const end = dateFromYmd(addDays(monday, 6));
  const startStr = `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endStr =
    start.getMonth() === end.getMonth()
      ? String(end.getDate())
      : `${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
  return `${startStr} – ${endStr}`;
}

/** Index a flat meal list by `${date}|${slot}` for O(1) grid lookup. */
export function indexMeals(meals: Meal[]): Map<string, Meal> {
  const m = new Map<string, Meal>();
  for (const meal of meals) m.set(slotKey(meal.date, meal.slot), meal);
  return m;
}

export function slotKey(date: string, slot: Slot): string {
  return `${date}|${slot}`;
}

/* ───────────────────────── Grocery aggregation (P2) ───────────────────────── */

export interface RecipeIngredient {
  qty: number | null;
  unit: string;
  item: string;
}

export interface RecipeBundle {
  id: number;
  name: string;
  ingredients: RecipeIngredient[];
}

export interface GroceryLine {
  /** The display title written into the grocery checklist, e.g. "2 cup flour". */
  title: string;
  /** Sort key for stable, grouped output. */
  item: string;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Roll a set of recipes' ingredients into a de-duplicated grocery list.
 *
 * Ingredients are merged when they share the same item *and* unit: their
 * quantities sum. Differing units (or a missing qty, e.g. "to taste") stay as
 * separate lines so we never add "1 cup" to "2 tbsp". Output is sorted by item
 * name for a tidy, scannable list. `recipes` may repeat (a recipe planned twice
 * in the week contributes twice).
 */
export function aggregateGroceries(recipes: RecipeBundle[]): GroceryLine[] {
  // key = item|unit → summed qty (null if any contributor lacked a qty)
  const merged = new Map<
    string,
    { item: string; unit: string; qty: number | null; hasNullQty: boolean }
  >();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const item = ing.item.trim();
      if (!item) continue;
      const unit = (ing.unit ?? "").trim();
      const key = `${normalizeKey(item)}|${normalizeKey(unit)}`;
      const existing = merged.get(key);
      if (existing) {
        if (ing.qty === null) existing.hasNullQty = true;
        else existing.qty = (existing.qty ?? 0) + ing.qty;
      } else {
        merged.set(key, {
          item,
          unit,
          qty: ing.qty,
          hasNullQty: ing.qty === null,
        });
      }
    }
  }

  const lines: GroceryLine[] = [];
  for (const { item, unit, qty, hasNullQty } of merged.values()) {
    const parts: string[] = [];
    // Only show a quantity if every contributor had one (otherwise it's misleading).
    if (qty !== null && !hasNullQty) parts.push(formatQty(qty));
    if (unit) parts.push(unit);
    parts.push(item);
    lines.push({ title: parts.join(" "), item });
  }

  lines.sort((a, b) => a.item.localeCompare(b.item));
  return lines;
}

/** Compact quantity: whole numbers bare, otherwise up to 2dp with trailing zeros trimmed. */
export function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return String(parseFloat(qty.toFixed(2)));
}
