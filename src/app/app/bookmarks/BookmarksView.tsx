"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  addBookmarkAction,
  deleteBookmarkAction,
  importBookmarksAction,
  markOpenedAction,
  setUnreadAction,
  updateBookmarkAction,
} from "./actions";
import {
  type AddedBucket,
  ADDED_BUCKET_ORDER,
  addedBucket,
  allTags,
  applyFilters,
  folderHue,
  toExportText,
  type Bookmark,
} from "./lib";
import { BucketSection, Ring, StatStrip, StatTile } from "../_factories/FactoryUI";
import { hexAlpha } from "../_factories/factoryLib";

const INPUT =
  "w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50";

export function BookmarksView({ bookmarks }: { bookmarks: Bookmark[] }) {
  const [showForm, setShowForm] = useState(false);
  const [urlSeed, setUrlSeed] = useState("");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showIO, setShowIO] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  const tags = useMemo(() => allTags(bookmarks), [bookmarks]);
  const unreadCount = useMemo(() => bookmarks.filter((b) => b.unread).length, [bookmarks]);
  const folderCount = useMemo(
    () => new Set(bookmarks.map((b) => b.folder).filter(Boolean)).size,
    [bookmarks],
  );
  const matches = useMemo(
    () => applyFilters(bookmarks, { query, tag, unreadOnly }),
    [bookmarks, query, tag, unreadOnly],
  );

  // Group the visible matches by how recently they were added — a Countdown-style
  // set of time buckets instead of one flat scroll.
  const buckets = useMemo(() => {
    const map = new Map<AddedBucket, Bookmark[]>();
    for (const b of matches) {
      const key = addedBucket(b.createdAt);
      (map.get(key) ?? map.set(key, []).get(key)!).push(b);
    }
    return ADDED_BUCKET_ORDER.map((label) => ({ label, items: map.get(label) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [matches]);

  async function openForm() {
    let seed = "";
    // "Add current" friendliness: prefill the URL from the clipboard if it
    // looks like a link. Best-effort — clipboard access can be denied.
    try {
      const text = (await navigator.clipboard?.readText())?.trim();
      if (text && /^(https?:\/\/|www\.)/i.test(text) && !/\s/.test(text)) {
        seed = text;
      }
    } catch {
      /* clipboard unavailable or denied — open blank */
    }
    setUrlSeed(seed);
    setShowForm(true);
  }

  function submit(formData: FormData) {
    start(async () => {
      await addBookmarkAction(formData);
      formRef.current?.reset();
      setUrlSeed("");
      setShowForm(false);
    });
  }

  const total = bookmarks.length;
  const readPct = total > 0 ? (total - unreadCount) / total : 1;

  return (
    <div>
      {total > 0 && (
        <>
          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-4">
              <Ring pct={readPct} size={72} stroke={8} tone={unreadCount > 0 ? "cyan" : "emerald"}>
                {unreadCount > 0 ? (
                  <span className="text-lg font-bold tabular-nums text-cyan-400">{unreadCount}</span>
                ) : (
                  <span className="text-xl text-emerald-400">✓</span>
                )}
              </Ring>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {unreadCount > 0 ? "Read it later" : "Reading list clear"}
                </div>
                <p className="mt-0.5 text-sm text-zinc-300">
                  {unreadCount > 0
                    ? `${unreadCount} link${unreadCount === 1 ? "" : "s"} waiting to be read.`
                    : "Nothing in your read-it-later queue."}
                </p>
              </div>
            </div>
          </div>

          <StatStrip cols={3}>
            <StatTile label="Saved" value={String(total)} tone="cyan" />
            <StatTile label="Unread" value={String(unreadCount)} tone={unreadCount > 0 ? "cyan" : "zinc"} />
            <StatTile label="Folders" value={String(folderCount)} tone={folderCount > 0 ? "emerald" : "zinc"} />
          </StatStrip>
        </>
      )}

      {!showForm ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openForm}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
          >
            + New bookmark
          </button>
          <button
            type="button"
            onClick={() => setShowIO((v) => !v)}
            aria-label="Import or export"
            className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            ⇅
          </button>
        </div>
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
            defaultValue={urlSeed}
            inputMode="url"
            autoComplete="off"
            placeholder="https://example.com"
            className={INPUT}
          />
          <input name="title" autoComplete="off" placeholder="Title (optional — derived from URL)" className={INPUT} />
          <input name="tags" autoComplete="off" placeholder="Tags, comma separated (optional)" className={INPUT} />
          <input name="folder" autoComplete="off" placeholder="Folder (optional)" className={INPUT} />
          <label className="flex items-center gap-2 px-1 text-sm text-zinc-300">
            <input type="checkbox" name="unread" className="h-4 w-4 accent-cyan-500" />
            Read it later
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setUrlSeed("");
              }}
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

      {showIO && <ImportExport bookmarks={bookmarks} onDone={() => setShowIO(false)} />}

      {bookmarks.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bookmarks…"
          className="mt-4 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
      )}

      {(tags.length > 0 || unreadCount > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={tag === null && !unreadOnly} onClick={() => { setTag(null); setUnreadOnly(false); }}>
            All
          </Chip>
          {unreadCount > 0 && (
            <Chip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
              Unread {unreadCount}
            </Chip>
          )}
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
        <div>
          {buckets.map((g) => (
            <BucketSection key={g.label} label={g.label} count={g.items.length}>
              {g.items.map((b) => (
                <BookmarkCard key={b.id} bookmark={b} onPickTag={setTag} />
              ))}
            </BucketSection>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportExport({ bookmarks, onDone }: { bookmarks: Bookmark[]; onDone: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function doImport() {
    if (!text.trim()) return;
    start(async () => {
      const n = await importBookmarksAction(text);
      setMsg(n > 0 ? `Imported ${n} bookmark${n === 1 ? "" : "s"}.` : "No valid URLs found.");
      if (n > 0) {
        setText("");
        onDone();
      }
    });
  }

  async function doExport() {
    const out = toExportText(bookmarks);
    try {
      await navigator.clipboard?.writeText(out);
      setMsg(`Copied ${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"} to clipboard.`);
    } catch {
      // Fallback: drop the export into the textarea so it can be copied manually.
      setText(out);
      setMsg("Clipboard unavailable — export shown below; copy it manually.");
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
      <p className="text-xs text-zinc-400">
        Paste one URL per line (optional title after a space) to import, or export your links.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"https://example.com First link\nhttps://news.site"}
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      {msg && <p className="text-xs text-cyan-400">{msg}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={doExport}
          disabled={bookmarks.length === 0}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={doImport}
          disabled={pending || !text.trim()}
          className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
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
    // Fire-and-forget; don't block the navigation on the round-trip. Opening a
    // read-it-later link clears its unread flag.
    start(async () => {
      await markOpenedAction(bookmark.id);
      if (bookmark.unread) await setUnreadAction(bookmark.id, false);
    });
  }
  function toggleUnread() {
    start(() => setUnreadAction(bookmark.id, !bookmark.unread));
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

  // Folder-hue tint: each folder colors its card a consistent hue. An unread
  // bookmark keeps its cyan border to stay the eye-catch.
  const hue = folderHue(bookmark.folder);
  const tinted = hue && !bookmark.unread;
  return (
    <li
      className={`rounded-2xl border bg-zinc-900/40 ${bookmark.unread ? "border-cyan-500/40" : "border-zinc-800"} ${pending ? "opacity-50" : ""}`}
      style={tinted ? { background: hexAlpha(hue, 0.05), borderColor: hexAlpha(hue, 0.25) } : undefined}
    >
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
            <span className="flex items-center gap-1.5">
              {bookmark.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-label="unread" />}
              <span className="block truncate text-sm font-semibold text-zinc-100">{bookmark.title}</span>
            </span>
            <span className="block truncate text-xs text-zinc-500">{bookmark.host}</span>
            {(bookmark.tags.length > 0 || bookmark.folder) && (
              <span className="mt-1 flex flex-wrap items-center gap-1">
                {bookmark.folder && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={
                      hue
                        ? { background: hexAlpha(hue, 0.15), color: hue }
                        : undefined
                    }
                  >
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
            onClick={toggleUnread}
            aria-label={bookmark.unread ? "Mark as read" : "Mark as read it later"}
            title={bookmark.unread ? "Mark as read" : "Read it later"}
            className={`rounded-lg p-1.5 hover:bg-zinc-800 ${bookmark.unread ? "text-cyan-400" : "text-zinc-600 hover:text-cyan-400"}`}
          >
            ◷
          </button>
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
