"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  matchesQuery,
  scaleFactor,
  scaleQty,
  formatQty,
  formatTime,
  totalTime,
  type Recipe,
} from "./lib";
import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
  type RecipeInput,
  type IngredientInput,
} from "./actions";

type Mode =
  | { kind: "list" }
  | { kind: "detail"; id: number }
  | { kind: "edit"; id: number | null } // null = new
  | { kind: "cook"; id: number };

export function RecipesView({ recipes }: { recipes: Recipe[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  const byId = useMemo(() => {
    const m = new Map<number, Recipe>();
    for (const r of recipes) m.set(r.id, r);
    return m;
  }, [recipes]);

  if (mode.kind === "edit") {
    const existing = mode.id === null ? null : byId.get(mode.id) ?? null;
    return (
      <Editor
        recipe={existing}
        onDone={(id) => setMode(id ? { kind: "detail", id } : { kind: "list" })}
        onCancel={() => setMode(existing ? { kind: "detail", id: existing.id } : { kind: "list" })}
      />
    );
  }

  if (mode.kind === "cook") {
    const recipe = byId.get(mode.id);
    if (!recipe) return <Empty onAdd={() => setMode({ kind: "edit", id: null })} />;
    return <CookMode recipe={recipe} onExit={() => setMode({ kind: "detail", id: recipe.id })} />;
  }

  if (mode.kind === "detail") {
    const recipe = byId.get(mode.id);
    if (!recipe) return <Empty onAdd={() => setMode({ kind: "edit", id: null })} />;
    return (
      <Detail
        recipe={recipe}
        onBack={() => setMode({ kind: "list" })}
        onEdit={() => setMode({ kind: "edit", id: recipe.id })}
        onCook={() => setMode({ kind: "cook", id: recipe.id })}
      />
    );
  }

  return (
    <List
      recipes={recipes}
      onOpen={(id) => setMode({ kind: "detail", id })}
      onAdd={() => setMode({ kind: "edit", id: null })}
    />
  );
}

/* ───────────────────────── List ───────────────────────── */

function List({
  recipes,
  onOpen,
  onAdd,
}: {
  recipes: Recipe[];
  onOpen: (id: number) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = recipes.filter((r) => matchesQuery(r, query));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, ingredient, tag…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New
        </button>
      </div>

      {recipes.length === 0 ? (
        <Empty onAdd={onAdd} />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
          No recipes match “{query}”.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const t = totalTime(r.prepMin, r.cookMin);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left hover:border-cyan-500/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-xl text-cyan-400 ring-1 ring-cyan-500/20">
                    ◍
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-100">{r.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                      {r.servings ? <span>{formatQty(r.servings)} servings</span> : null}
                      {t ? <span>{formatTime(t)}</span> : null}
                      <span>{r.ingredients.length} ingredients</span>
                    </div>
                    {r.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-zinc-600">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">◍</div>
      <p className="mt-2 text-sm text-zinc-300">No recipes yet.</p>
      <p className="text-xs text-zinc-500">Add ingredients, steps, and timings you can cook from.</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
      >
        + New recipe
      </button>
    </div>
  );
}

/* ───────────────────────── Detail (with servings scaler) ───────────────────────── */

function Detail({
  recipe,
  onBack,
  onEdit,
  onCook,
}: {
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
  onCook: () => void;
}) {
  const [, start] = useTransition();
  const baseServings = recipe.servings ?? null;
  const [target, setTarget] = useState<number>(baseServings && baseServings > 0 ? baseServings : 1);
  const factor = scaleFactor(baseServings, target);
  const t = totalTime(recipe.prepMin, recipe.cookMin);

  function remove() {
    if (!confirm(`Delete “${recipe.name}”?`)) return;
    start(async () => {
      await deleteRecipe(recipe.id);
      onBack();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-cyan-400 hover:text-cyan-300">
          ‹ All recipes
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:border-rose-500/50 hover:text-rose-400"
          >
            Delete
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{recipe.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
          {recipe.prepMin ? <span>Prep {formatTime(recipe.prepMin)}</span> : null}
          {recipe.cookMin ? <span>Cook {formatTime(recipe.cookMin)}</span> : null}
          {t ? <span className="text-zinc-300">Total {formatTime(t)}</span> : null}
        </div>
        {recipe.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCook}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
      >
        ▶ Start cooking
      </button>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Ingredients</h3>
          <ServingsStepper
            value={target}
            base={baseServings}
            onChange={setTarget}
          />
        </div>
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-zinc-500">No ingredients listed.</p>
        ) : (
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing) => {
              const q = scaleQty(ing.qty, factor);
              const qtyText = formatQty(q);
              return (
                <li key={ing.id} className="flex items-baseline gap-2 text-sm text-zinc-200">
                  <span className="min-w-[3rem] shrink-0 text-right font-medium tabular-nums text-cyan-300">
                    {qtyText}
                  </span>
                  <span className="shrink-0 text-zinc-400">{ing.unit}</span>
                  <span>{ing.item}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Steps</h3>
        {recipe.steps.length === 0 ? (
          <p className="text-sm text-zinc-500">No steps listed.</p>
        ) : (
          <ol className="space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={s.id} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-zinc-200">{s.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {recipe.notes && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">Notes</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{recipe.notes}</p>
        </section>
      )}
    </div>
  );
}

function ServingsStepper({
  value,
  base,
  onChange,
}: {
  value: number;
  base: number | null;
  onChange: (n: number) => void;
}) {
  const scaled = base !== null && base > 0 && value !== base;
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Fewer servings"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 hover:border-cyan-500"
      >
        −
      </button>
      <span
        className={`min-w-[2.5rem] text-center text-sm font-semibold tabular-nums ${
          scaled ? "text-cyan-300" : "text-zinc-200"
        }`}
      >
        {formatQty(value)}
        <span className="ml-1 text-[10px] font-normal text-zinc-500">srv</span>
      </span>
      <button
        type="button"
        aria-label="More servings"
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 hover:border-cyan-500"
      >
        +
      </button>
    </div>
  );
}

/* ───────────────────────── Cook mode ───────────────────────── */

// Keep-awake while cooking. Re-requests on visibility change because the lock
// is dropped when the tab is backgrounded. Degrades silently where unsupported.
function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: WakeLock };

    async function request() {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") {
          const lock = await nav.wakeLock.request("screen");
          if (cancelled) lock.release().catch(() => {});
          else lockRef.current = lock;
        }
      } catch {
        // request can reject (e.g. low battery) — ignore.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible" && !lockRef.current) void request();
    }

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, []);
}

function CookMode({ recipe, onExit }: { recipe: Recipe; onExit: () => void }) {
  const baseServings = recipe.servings ?? null;
  const [target, setTarget] = useState<number>(baseServings && baseServings > 0 ? baseServings : 1);
  const [done, setDone] = useState<Set<number>>(new Set());
  const factor = scaleFactor(baseServings, target);
  useWakeLock();

  function toggle(id: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exit() {
    onExit();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">{recipe.name}</h2>
        <button
          type="button"
          onClick={exit}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
        >
          ✕ Done cooking
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Screen stays awake</span>
        <ServingsStepper value={target} base={baseServings} onChange={setTarget} />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Ingredients</h3>
        <ul className="space-y-1 text-base">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="flex items-baseline gap-2 text-zinc-200">
              <span className="min-w-[3rem] shrink-0 text-right font-semibold tabular-nums text-cyan-300">
                {formatQty(scaleQty(ing.qty, factor))}
              </span>
              <span className="shrink-0 text-zinc-400">{ing.unit}</span>
              <span>{ing.item}</span>
            </li>
          ))}
        </ul>
      </section>

      <ol className="space-y-3">
        {recipe.steps.map((s, i) => {
          const checked = done.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className={`flex w-full gap-3 rounded-xl border p-4 text-left transition ${
                  checked
                    ? "border-zinc-800 bg-zinc-900/30 opacity-50"
                    : "border-zinc-700 bg-zinc-900/60"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    checked ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {checked ? "✓" : i + 1}
                </span>
                <span
                  className={`text-lg leading-relaxed ${checked ? "text-zinc-500 line-through" : "text-zinc-100"}`}
                >
                  {s.text}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────────────────────── Editor ───────────────────────── */

interface EditIngredient extends IngredientInput {
  key: number;
}

let keySeq = 1;
function newKey() {
  return keySeq++;
}

function Editor({
  recipe,
  onDone,
  onCancel,
}: {
  recipe: Recipe | null;
  onDone: (id: number | null) => void;
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(recipe?.name ?? "");
  const [servings, setServings] = useState(recipe?.servings != null ? String(recipe.servings) : "");
  const [prep, setPrep] = useState(recipe?.prepMin != null ? String(recipe.prepMin) : "");
  const [cook, setCook] = useState(recipe?.cookMin != null ? String(recipe.cookMin) : "");
  const [tags, setTags] = useState(recipe?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [ingredients, setIngredients] = useState<EditIngredient[]>(
    recipe && recipe.ingredients.length > 0
      ? recipe.ingredients.map((i) => ({ key: newKey(), qty: i.qty, unit: i.unit, item: i.item }))
      : [{ key: newKey(), qty: null, unit: "", item: "" }],
  );
  const [steps, setSteps] = useState<{ key: number; text: string }[]>(
    recipe && recipe.steps.length > 0
      ? recipe.steps.map((s) => ({ key: newKey(), text: s.text }))
      : [{ key: newKey(), text: "" }],
  );

  function numField(v: string): number | null {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function save() {
    if (!name.trim()) return;
    const input: RecipeInput = {
      name,
      servings: numField(servings),
      prepMin: numField(prep),
      cookMin: numField(cook),
      tags,
      notes,
      ingredients: ingredients.map((i) => ({ qty: i.qty, unit: i.unit, item: i.item })),
      steps: steps.map((s) => s.text),
    };
    start(async () => {
      if (recipe) {
        await updateRecipe(recipe.id, input);
        onDone(recipe.id);
      } else {
        const id = await createRecipe(input);
        onDone(id);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-200">
          ‹ Cancel
        </button>
        <h2 className="text-sm font-semibold text-zinc-200">{recipe ? "Edit recipe" : "New recipe"}</h2>
        <button
          type="button"
          onClick={save}
          disabled={pending || !name.trim()}
          className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recipe name"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Servings">
          <NumInput value={servings} onChange={setServings} placeholder="4" />
        </Field>
        <Field label="Prep (min)">
          <NumInput value={prep} onChange={setPrep} placeholder="15" />
        </Field>
        <Field label="Cook (min)">
          <NumInput value={cook} onChange={setCook} placeholder="30" />
        </Field>
      </div>

      <Field label="Tags (comma separated)">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="italian, dinner, vegetarian"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </Field>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Ingredients</h3>
        <ul className="space-y-2">
          {ingredients.map((ing, idx) => (
            <li key={ing.key} className="flex gap-2">
              <input
                inputMode="decimal"
                value={ing.qty == null ? "" : String(ing.qty)}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  setIngredients((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, qty: Number.isFinite(n) ? n : null } : x,
                    ),
                  );
                }}
                placeholder="Qty"
                className="w-16 shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
              />
              <input
                value={ing.unit}
                onChange={(e) =>
                  setIngredients((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)),
                  )
                }
                placeholder="unit"
                className="w-20 shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
              />
              <input
                value={ing.item}
                onChange={(e) =>
                  setIngredients((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, item: e.target.value } : x)),
                  )
                }
                placeholder="ingredient"
                className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
              />
              <button
                type="button"
                aria-label="Remove ingredient"
                onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setIngredients((prev) => [...prev, { key: newKey(), qty: null, unit: "", item: "" }])}
          className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          + Add ingredient
        </button>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Steps</h3>
        <ol className="space-y-2">
          {steps.map((s, idx) => (
            <li key={s.key} className="flex gap-2">
              <span className="flex h-9 w-7 shrink-0 items-center justify-center text-sm font-semibold text-zinc-500">
                {idx + 1}
              </span>
              <textarea
                value={s.text}
                onChange={(e) =>
                  setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))
                }
                rows={2}
                placeholder="Describe this step…"
                className="min-w-0 flex-1 resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
              />
              <button
                type="button"
                aria-label="Remove step"
                onClick={() => setSteps((prev) => prev.filter((_, i) => i !== idx))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setSteps((prev) => [...prev, { key: newKey(), text: "" }])}
          className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          + Add step
        </button>
      </section>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Make-ahead tips, substitutions…"
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
    />
  );
}
