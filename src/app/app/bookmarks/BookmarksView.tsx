"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  addBookmarkAction,
  deleteBookmarkAction,
  markOpenedAction,
  updateBookmarkAction,
} from "./actions";
import { type Bookmark, allTags, applyFilters } from "./lib";

const INPUT =
  "w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50";

export function BookmarksView({ bookmarks }: { bookmarks: Bookmark[] }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  const tags = useMemo(() => allTags(bookmarks), [bookmarks]);
  const matches = useMemo(
    () => applyFilters(bookmarks, { query, tag }),
    [bookmarks, query, tag],
  );

  function submit(formData: FormData) {
    start(async () => {
      await addBookmarkAction(formData);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New bookmark
        </button>
      ) : (
        <form
          ref={formRef}
          action={submit}
          className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
        >
          <input
            name="url"
            required
            autoFocus
            inputMode="url"
            autoComplete="off"
            placeholder="https://example.com"
            className={INPUT}
          />
          <input name="title" autoComplete="off" placeholder="Title (optional — derived from URL)" className={INPUT} />
          <input name="tags" autoComplete="off" placeholder="Tags, comma separated (optional)" className={INPUT} />
          <input name="folder" autoComplete="off" placeholder="Folder (optional)" className={INPUT} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {bookmarks.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookmarks…"
          className="mt-4 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
      )}

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={tag === null} onClick={() => setTag(null)}>
            All
          </Chip>
          {tags.map((t) => (
            <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </Chip>
          ))}
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No bookmarks yet.</p>
          <p className="mt-1 text-xs text-zinc-500">Save a link and tap it to open in a new tab.</p>
        </div>
      ) : matches.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">No bookmarks match your filters.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {matches.map((b) => (
            <BookmarkCard key={b.id} bookmark={b} onPickTag={setTag} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-cyan-500 text-zinc-950"
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function BookmarkCard({
  bookmark,
  onPickTag,
}: {
  bookmark: Bookmark;
  onPickTag: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(bookmark.url);
  const [title, setTitle] = useState(bookmark.title);
  const [tags, setTags] = useState(bookmark.tags.join(", "));
  const [folder, setFolder] = useState(bookmark.folder ?? "");
  const [pending, start] = useTransition();

  function open() {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
    // Fire-and-forget; don't block the navigation on the round-trip.
    start(() => markOpenedAction(bookmark.id));
  }
  function remove() {
    if (!confirm("Delete this bookmark?")) return;
    start(() => deleteBookmarkAction(bookmark.id));
  }
  function openEdit() {
    setUrl(bookmark.url);
    setTitle(bookmark.title);
    setTags(bookmark.tags.join(", "));
    setFolder(bookmark.folder ?? "");
    setEditing(true);
  }
  function save() {
    if (!url.trim()) return;
    start(async () => {
      await updateBookmarkAction(bookmark.id, url, title, tags, folder);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 ${pending ? "opacity-50" : ""}`}>
        <div className="space-y-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} autoFocus inputMode="url" autoComplete="off" placeholder="URL" className={INPUT} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" placeholder="Title" className={INPUT} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} autoComplete="off" placeholder="Tags, comma separated" className={INPUT} />
          <input value={folder} onChange={(e) => setFolder(e.target.value)} autoComplete="off" placeholder="Folder" className={INPUT} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !url.trim()}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-l-2xl p-3 text-left hover:bg-zinc-800/40"
        >
          {bookmark.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bookmark.faviconUrl}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0 rounded"
            />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
              ↗
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-zinc-100">{bookmark.title}</span>
            <span className="block truncate text-xs text-zinc-500">{bookmark.host}</span>
            {(bookmark.tags.length > 0 || bookmark.folder) && (
              <span className="mt-1 flex flex-wrap items-center gap-1">
                {bookmark.folder && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {bookmark.folder}
                  </span>
                )}
                {bookmark.tags.map((t) => (
                  <span
                    key={t}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickTag(t);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onPickTag(t);
                      }
                    }}
                    className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400 hover:bg-cyan-500/20"
                  >
                    #{t}
                  </span>
                ))}
              </span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 flex-col justify-center gap-1 pr-2">
          <button
            type="button"
            onClick={openEdit}
            aria-label="Edit bookmark"
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-cyan-400"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={remove}
            aria-label="Delete bookmark"
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}
