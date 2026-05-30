"use client";

import { useMemo, useState, useTransition } from "react";
import {
  SLOTS,
  SLOT_LABEL,
  indexMeals,
  slotKey,
  weekDates,
  weekStart,
  weekRangeLabel,
  weekdayShort,
  weekdayLong,
  dayLabel,
  addDays,
  type Meal,
  type Slot,
} from "./lib";
import {
  setMeal,
  clearMeal,
  generateGroceries,
  getWeekMeals,
  copyWeek,
} from "./actions";
import type { RecipeOption } from "./page";

interface EditTarget {
  date: string;
  slot: Slot;
  current: Meal | null;
}

export function MealPlannerView({
  today,
  initialMeals,
  recipes,
}: {
  today: string;
  initialMeals: Meal[];
  recipes: RecipeOption[];
}) {
  const [anchor, setAnchor] = useState<string>(weekStart(today));
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const dates = useMemo(() => weekDates(anchor), [anchor]);
  // Only meals within the visible week are shown — the list may hold extra dates
  // pulled while navigating, so filter at render time.
  const grid = useMemo(() => indexMeals(meals.filter((m) => dates.includes(m.date))), [meals, dates]);

  const recipeById = useMemo(() => {
    const m = new Map<number, RecipeOption>();
    for (const r of recipes) m.set(r.id, r);
    return m;
  }, [recipes]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  /** Replace the meal at (date, slot) in local state. */
  function applyLocal(date: string, slot: Slot, next: Meal | null) {
    setMeals((prev) => {
      const without = prev.filter((m) => !(m.date === date && m.slot === slot));
      return next ? [...without, next] : without;
    });
  }

  function navigateWeek(deltaDays: number) {
    const nextAnchor = weekStart(addDays(anchor, deltaDays));
    setAnchor(nextAnchor);
    const nextDates = weekDates(nextAnchor);
    // Fetch if we don't already have this week cached.
    const haveAll = nextDates.some((d) => meals.some((m) => m.date === d));
    if (!haveAll) {
      start(async () => {
        const wk = await getWeekMeals(nextDates);
        setMeals((prev) => [...prev.filter((m) => !nextDates.includes(m.date)), ...wk]);
      });
    }
  }

  function goToday() {
    setAnchor(weekStart(today));
  }

  function saveSlot(date: string, slot: Slot, name: string, recipeId: number | null) {
    const trimmed = name.trim();
    setEditing(null);
    start(async () => {
      await setMeal(date, slot, trimmed, recipeId);
      if (!trimmed) {
        applyLocal(date, slot, null);
      } else {
        applyLocal(date, slot, {
          id: grid.get(slotKey(date, slot))?.id ?? -Date.now(),
          date,
          slot,
          meal: trimmed,
          recipeId,
        });
      }
    });
  }

  function removeSlot(date: string, slot: Slot) {
    setEditing(null);
    start(async () => {
      await clearMeal(date, slot);
      applyLocal(date, slot, null);
    });
  }

  function onGenerate() {
    start(async () => {
      const res = await generateGroceries(dates);
      if (res.added > 0) {
        flash(`Added ${res.added} item${res.added === 1 ? "" : "s"} to your grocery list.`);
      } else if (res.recipes === 0) {
        flash("No recipe-linked meals this week — link recipes to build a list.");
      } else {
        flash("Grocery list already has everything from this week.");
      }
    });
  }

  function onCopyLastWeek() {
    const prevMonday = addDays(anchor, -7);
    start(async () => {
      const wk = await copyWeek(prevMonday, anchor);
      setMeals((prev) => [...prev.filter((m) => !dates.includes(m.date)), ...wk]);
      flash("Copied last week's plan.");
    });
  }

  const isThisWeek = anchor === weekStart(today);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigateWeek(-7)}
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:border-cyan-500"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-zinc-100">{weekRangeLabel(anchor)}</div>
          {!isThisWeek && (
            <button
              type="button"
              onClick={goToday}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Jump to this week
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigateWeek(7)}
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:border-cyan-500"
        >
          ›
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Generate grocery list
        </button>
        <button
          type="button"
          onClick={onCopyLastWeek}
          disabled={pending}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
        >
          Copy last week
        </button>
      </div>

      {toast && (
        <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
          {toast}
        </p>
      )}

      {/* Day-by-day grid (phone-first vertical, two columns on wider screens) */}
      <div className="grid gap-3 sm:grid-cols-2">
        {dates.map((date) => {
          const isToday = date === today;
          return (
            <section
              key={date}
              className={`rounded-2xl border p-3 ${
                isToday
                  ? "border-cyan-500/50 bg-cyan-500/5"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {weekdayLong(date)}
                  <span className="ml-2 text-xs font-normal text-zinc-500">{dayLabel(date)}</span>
                </h2>
                {isToday && (
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    Today
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {SLOTS.map((slot) => {
                  const meal = grid.get(slotKey(date, slot)) ?? null;
                  const linked = meal?.recipeId != null && recipeById.has(meal.recipeId);
                  return (
                    <li key={slot}>
                      <button
                        type="button"
                        onClick={() => setEditing({ date, slot, current: meal })}
                        className="flex w-full items-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-900/60 px-3 py-2 text-left hover:border-cyan-500/40"
                      >
                        <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          {SLOT_LABEL[slot]}
                        </span>
                        {meal ? (
                          <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                            {meal.meal}
                            {linked && (
                              <span className="ml-1.5 text-cyan-400" title="Linked recipe">
                                ◍
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                            + Add meal
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {editing && (
        <SlotEditor
          target={editing}
          recipes={recipes}
          onSave={saveSlot}
          onRemove={removeSlot}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Slot editor (sheet) ───────────────────────── */

function SlotEditor({
  target,
  recipes,
  onSave,
  onRemove,
  onClose,
}: {
  target: EditTarget;
  recipes: RecipeOption[];
  onSave: (date: string, slot: Slot, name: string, recipeId: number | null) => void;
  onRemove: (date: string, slot: Slot) => void;
  onClose: () => void;
}) {
  const { date, slot, current } = target;
  const [name, setName] = useState(current?.meal ?? "");
  const [recipeId, setRecipeId] = useState<number | null>(current?.recipeId ?? null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? recipes.filter((r) => r.name.toLowerCase().includes(q)) : recipes;
    return list.slice(0, 30);
  }, [recipes, query]);

  function pickRecipe(r: RecipeOption) {
    setRecipeId(r.id);
    setName(r.name);
  }

  function clearLink() {
    setRecipeId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">
            {SLOT_LABEL[slot]} · {weekdayShort(date)} {dayLabel(date)}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Meal
          </span>
          <input
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              // Editing the text by hand breaks the recipe link.
              if (recipeId !== null) setRecipeId(null);
            }}
            placeholder="e.g. Pasta night"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
          />
        </label>

        {recipeId !== null && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200">
            <span className="flex-1">Linked to a recipe — feeds the grocery list.</span>
            <button type="button" onClick={clearLink} className="text-cyan-300 hover:text-cyan-100">
              Unlink
            </button>
          </div>
        )}

        {recipes.length > 0 && (
          <div className="mt-3">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Or pick a recipe
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes…"
              className="mb-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
            />
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pickRecipe(r)}
                    className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-sm hover:bg-zinc-800 ${
                      recipeId === r.id ? "bg-cyan-500/15 text-cyan-200" : "text-zinc-200"
                    }`}
                  >
                    {r.name}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-1.5 text-sm text-zinc-500">No matching recipes.</li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {current && (
            <button
              type="button"
              onClick={() => onRemove(date, slot)}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-500 hover:border-rose-500/50 hover:text-rose-400"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(date, slot, name, recipeId)}
            className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
