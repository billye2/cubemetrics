"use client";

import { useTransition } from "react";
import { addEntryAction } from "../actions";

const MOODS = ["😊", "😌", "😐", "😔", "😤", "😴", "🤔"];

export function NewEntryForm() {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(() => addEntryAction(formData));
  }

  return (
    <form action={submit} className="space-y-3">
      <input
        name="title"
        placeholder="Title (optional)"
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
      />
      <textarea
        name="body"
        required
        autoFocus
        placeholder="What's on your mind?"
        rows={12}
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
      />
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Mood</div>
        <div className="flex flex-wrap gap-2">
          <input type="hidden" name="mood" id="mood-input" />
          {MOODS.map((m) => (
            <label
              key={m}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-xl transition has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-500/10"
            >
              <input
                type="radio"
                name="mood-radio"
                value={m}
                className="sr-only"
                onChange={(e) => {
                  const hidden = document.getElementById("mood-input") as HTMLInputElement | null;
                  if (hidden) hidden.value = e.target.value;
                }}
              />
              {m}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}
