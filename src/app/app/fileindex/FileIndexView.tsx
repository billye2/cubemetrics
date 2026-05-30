"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  type FileEntry,
  type SortKey,
  allTags,
  allTypes,
  applyFilters,
  formatSize,
  isUrl,
  sortEntries,
} from "./lib";
import { addFileEntry, deleteFileEntry, updateFileEntry } from "./actions";

const SORT_OPTIONS: { v: SortKey; label: string }[] = [
  { v: "added", label: "Recently added" },
  { v: "name", label: "Name" },
  { v: "date", label: "File date" },
  { v: "type", label: "Type" },
];

export function FileIndexView({ entries }: { entries: FileEntry[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("added");

  const tags = useMemo(() => allTags(entries), [entries]);
  const types = useMemo(() => allTypes(entries), [entries]);

  const visible = useMemo(
    () => sortEntries(applyFilters(entries, { query, tag, type }), sort),
    [entries, query, tag, type, sort],
  );

  const filtering = Boolean(query.trim() || tag || type);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Files" value={String(entries.length)} />
        <Stat label="Tags" value={String(tags.length)} />
        <Stat label="Types" value={String(types.length)} />
      </div>

      <AddForm />

      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3">
            <span className="text-zinc-500" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              placeholder="Search name, path, tags, description…"
              aria-label="Search files"
              className="min-h-[44px] w-full bg-transparent py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort files"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.v} value={o.v} className="bg-zinc-900">
                  {o.label}
                </option>
              ))}
            </select>
            {types.length > 0 && (
              <select
                value={type ?? ""}
                onChange={(e) => setType(e.target.value || null)}
                aria-label="Filter by type"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
              >
                <option value="" className="bg-zinc-900">
                  All types
                </option>
                {types.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = tag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(on ? null : t)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      on
                        ? "bg-cyan-500 text-zinc-950"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
          No files match{" "}
          {filtering ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTag(null);
                setType(null);
              }}
              className="font-medium text-cyan-400 hover:underline"
            >
              — clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => (
            <FileRow key={e.id} entry={e} onTag={(t) => setTag(t)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-3 text-center">
      <div className="text-base font-semibold tabular-nums text-zinc-100">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function AddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    const sizeRaw = String(formData.get("sizeBytes") || "").trim();
    const sizeBytes = sizeRaw ? Number(sizeRaw) : undefined;
    start(async () => {
      await addFileEntry({
        name,
        location: String(formData.get("location") || "").trim(),
        type: String(formData.get("type") || "").trim(),
        tags: String(formData.get("tags") || "").trim(),
        sizeBytes: sizeBytes != null && Number.isFinite(sizeBytes) ? sizeBytes : undefined,
        fileDate: String(formData.get("fileDate") || "").trim(),
        description: String(formData.get("description") || "").trim(),
      });
      formRef.current?.reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-2 text-sm font-medium text-zinc-400 hover:border-cyan-500/60 hover:text-cyan-300"
      >
        + Catalog a file
      </button>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60";

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input name="name" autoComplete="off" placeholder="Name (e.g. Tax return 2025.pdf)" className={inputCls} />
      <input
        name="location"
        autoComplete="off"
        placeholder="Location / path (drive, folder, box, or URL)"
        className={`${inputCls} text-sm`}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="type"
          autoComplete="off"
          placeholder="Type (doc, photo, disk…)"
          className={`${inputCls} text-sm`}
        />
        <input name="tags" autoComplete="off" placeholder="Tags (comma separated)" className={`${inputCls} text-sm`} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">Date</span>
          <input
            name="fileDate"
            type="date"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none [color-scheme:dark]"
          />
        </label>
        <input
          name="sizeBytes"
          type="number"
          min={0}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Size (bytes)"
          className={`${inputCls} text-sm`}
        />
      </div>
      <input
        name="description"
        autoComplete="off"
        placeholder="Description / note (optional)"
        className={`${inputCls} text-sm`}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Add to index
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[44px] rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FileRow({ entry, onTag }: { entry: FileEntry; onTag: (t: string) => void }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = isUrl(entry.location);
  const size = formatSize(entry.sizeBytes);

  function remove() {
    if (!confirm(`Remove “${entry.name}” from the index?`)) return;
    start(() => deleteFileEntry(entry.id));
  }

  async function copyPath() {
    if (!entry.location) return;
    try {
      await navigator.clipboard.writeText(entry.location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
    }
  }

  return (
    <li className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 py-3 pl-3 pr-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-words text-sm font-medium text-zinc-100">{entry.name}</span>
            {entry.type && <span className="text-xs text-zinc-500">{entry.type}</span>}
          </div>
          {entry.location && (
            <div className="mt-0.5 truncate text-xs text-zinc-500" title={entry.location}>
              {entry.location}
            </div>
          )}
          {entry.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.tags.map((t) => (
                <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Delete entry"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
          {entry.location ? (
            <div className="space-y-2">
              <div className="break-all rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2 font-mono text-[11px] text-zinc-300">
                {entry.location}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyPath}
                  className="min-h-[36px] flex-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-cyan-500/60 hover:text-cyan-300"
                >
                  {copied ? "Copied!" : "Copy path"}
                </button>
                {url && (
                  <a
                    href={entry.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[36px] flex-1 items-center justify-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"
                  >
                    Open ↗
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">No location recorded.</p>
          )}
          {entry.description && <p className="break-words text-zinc-300">{entry.description}</p>}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {entry.fileDate && (
              <div className="flex justify-between">
                <span>Date</span>
                <span className="tabular-nums text-zinc-300">{entry.fileDate}</span>
              </div>
            )}
            {size && (
              <div className="flex justify-between">
                <span>Size</span>
                <span className="tabular-nums text-zinc-300">{size}</span>
              </div>
            )}
          </div>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTag(t)}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">☰</div>
      <p className="mt-2 text-sm text-zinc-300">Your file index is empty.</p>
      <p className="text-xs text-zinc-500">
        Catalog where a document, scan, photo, or disk lives — then find it in seconds.
      </p>
    </div>
  );
}
