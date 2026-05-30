"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  LIFE_AREAS,
  activeAreas,
  areaFor,
  filterByArea,
  type VisionCard,
} from "./lib";
import { addImageCard, addQuoteCard, deleteCard } from "./actions";

type ComposeMode = "quote" | "image";

export function VisionBoardView({ cards }: { cards: VisionCard[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const visible = useMemo(() => filterByArea(cards, filter), [cards, filter]);
  const areas = useMemo(() => activeAreas(cards), [cards]);

  return (
    <div className="space-y-6">
      <Compose />

      {cards.length > 0 && areas.length > 0 && (
        <FilterChips areas={areas} active={filter} onPick={setFilter} />
      )}

      {cards.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
          Nothing in this life area yet.
        </p>
      ) : (
        <div className="columns-2 gap-3 [column-fill:_balance]">
          {visible.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Compose() {
  const [mode, setMode] = useState<ComposeMode>("quote");
  const [section, setSection] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(async () => {
      if (mode === "quote") {
        const text = String(formData.get("text") || "").trim();
        if (!text) return;
        await addQuoteCard(text, section);
      } else {
        const url = String(formData.get("imageUrl") || "").trim();
        if (!/^https?:\/\//i.test(url)) return;
        const caption = String(formData.get("caption") || "").trim();
        await addImageCard(url, caption, section);
      }
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <div className="flex gap-1 rounded-lg bg-zinc-950/60 p-1">
        <ModeTab label="Quote" active={mode === "quote"} onClick={() => setMode("quote")} />
        <ModeTab label="Image" active={mode === "image"} onClick={() => setMode("image")} />
      </div>

      {mode === "quote" ? (
        <textarea
          name="text"
          rows={2}
          autoComplete="off"
          placeholder="An aspiration, affirmation, or quote…"
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      ) : (
        <div className="space-y-2">
          <input
            name="imageUrl"
            type="url"
            autoComplete="off"
            inputMode="url"
            placeholder="Image URL (https://…)"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
          />
          <input
            name="caption"
            autoComplete="off"
            placeholder="Caption (optional)"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          aria-label="Life area"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
        >
          <option value="">No life area</option>
          {LIFE_AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function FilterChips({
  areas,
  active,
  onPick,
}: {
  areas: ReturnType<typeof activeAreas>;
  active: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div className="-mx-1 flex flex-wrap gap-2 px-1">
      <Chip label="All" selected={active === null} onClick={() => onPick(null)} />
      {areas.map((a) => (
        <Chip
          key={a.id}
          label={a.label}
          tone={a.chip}
          selected={active === a.id}
          onClick={() => onPick(active === a.id ? null : a.id)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  tone,
  selected,
  onClick,
}: {
  label: string;
  tone?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
        selected
          ? tone
            ? tone
            : "bg-zinc-100 text-zinc-900 ring-zinc-100"
          : "bg-zinc-900/60 text-zinc-400 ring-zinc-800 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function CardTile({ card }: { card: VisionCard }) {
  const [pending, start] = useTransition();
  const area = areaFor(card.section);

  function remove() {
    if (!confirm("Remove this from your board?")) return;
    start(() => deleteCard(card.id));
  }

  return (
    <div
      className={`group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border bg-zinc-900/50 ${
        card.kind === "quote" ? area.accent : "border-zinc-800"
      } ${pending ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Remove card"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950/70 text-zinc-300 opacity-0 transition hover:text-rose-400 group-hover:opacity-100 focus:opacity-100"
      >
        <span className="text-lg leading-none">×</span>
      </button>

      {card.kind === "image" ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl ?? ""}
            alt={card.text ?? "Vision"}
            loading="lazy"
            className="w-full object-cover"
          />
          {card.text && (
            <div className="px-3 py-2 text-sm text-zinc-200">{card.text}</div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[120px] items-center justify-center px-4 py-6">
          <p className="text-center text-base font-medium leading-snug text-zinc-100">
            {card.text}
          </p>
        </div>
      )}

      {card.section && (
        <div className="px-3 pb-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ${area.chip}`}
          >
            {area.label}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-cyan-400">✧</div>
      <p className="mt-2 text-sm text-zinc-300">Your board is empty.</p>
      <p className="text-xs text-zinc-500">
        Add a quote that moves you or an image of where you&apos;re heading. No checkboxes — just
        vision.
      </p>
    </div>
  );
}
