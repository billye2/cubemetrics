"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Inline single-line text editor. Renders `children` (the read-only display) plus
 * a reveal-on-hover pencil; clicking it swaps to an input with save/cancel. Enter
 * saves, Escape cancels. The save is skipped when the value is empty or unchanged,
 * so an accidental edit never blanks a title.
 *
 * Shared across the custom apps that previously had no way to fix a typo
 * (todo title, habit name, …). Multi-field records (notes, countdowns) drive
 * their own edit mode instead.
 */
export function InlineEdit({
  value,
  onSave,
  children,
  ariaLabel = "Edit",
  placeholder,
  inputClassName = "",
}: {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  children: React.ReactNode;
  ariaLabel?: string;
  placeholder?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Select the whole value when the editor opens (DOM-only, no state writes).
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function open() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function save() {
    const next = draft.trim();
    if (!next || next === value.trim()) {
      cancel();
      return;
    }
    start(async () => {
      await onSave(next);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="group/inline flex min-w-0 items-start gap-1">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={open}
          aria-label={ariaLabel}
          className="shrink-0 rounded-lg p-1 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-cyan-400 group-hover/inline:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none sm:opacity-100"
        >
          <span className="text-xs leading-none">✎</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      <input
        ref={inputRef}
        value={draft}
        autoFocus
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={`min-w-0 flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50 ${inputClassName}`}
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        aria-label="Save"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={cancel}
        aria-label="Cancel"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      >
        ×
      </button>
    </div>
  );
}
