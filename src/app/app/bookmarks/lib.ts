// Pure logic for the Bookmarks link locker. No React, no Supabase — everything
// here is unit-tested in tests/unit/bookmarks-lib.test.ts.

export interface BookmarkRow {
  id: number;
  url: string;
  title: string | null;
  tags: string[] | null;
  folder: string | null;
  favicon_url: string | null;
  last_opened_at: string | null;
  created_at: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  tags: string[];
  folder: string | null;
  faviconUrl: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  host: string;
}

/**
 * Normalise a user-typed URL into a canonical href. Adds https:// when no
 * scheme is present so "example.com" becomes a real link. Returns null when the
 * input can't be coerced into a valid http(s) URL.
 */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname.includes(".")) return null;
  return u.toString();
}

/** Hostname without a leading "www." — used as a fallback title and label. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Derive a human title from a URL when the user didn't supply one: the last
 * meaningful path segment (de-slugified) if present, otherwise the bare host.
 */
export function deriveTitle(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const segs = u.pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1];
  if (last) {
    const cleaned = decodeURIComponent(last)
      .replace(/\.[a-z0-9]{1,5}$/i, "") // strip a file extension
      .replace(/[-_]+/g, " ")
      .trim();
    if (cleaned) return cleaned;
  }
  return hostOf(url);
}

/** Google's favicon service for a given URL's host. */
export function faviconFor(url: string): string {
  const host = hostOf(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

/** Parse a comma-separated tag string: trim, lowercase, strip leading #, de-dupe, cap at 12. */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const t = raw.trim().replace(/^#+/, "").toLowerCase();
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

function cleanStr(s: string | null): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length ? t : null;
}

/** Normalise a DB row into a derived Bookmark view model. */
export function toBookmark(row: BookmarkRow): Bookmark {
  const title = cleanStr(row.title) ?? deriveTitle(row.url);
  return {
    id: row.id,
    url: row.url,
    title,
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    folder: cleanStr(row.folder),
    faviconUrl: cleanStr(row.favicon_url),
    lastOpenedAt: cleanStr(row.last_opened_at),
    createdAt: row.created_at,
    host: hostOf(row.url),
  };
}

/** Free-text search across title, url, host and tags. Every term must match. */
export function matchesQuery(b: Bookmark, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [b.title, b.url, b.host, b.tags.join(" ")].join(" ").toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

export interface Filters {
  query: string;
  tag: string | null;
}

export function applyFilters(list: Bookmark[], f: Filters): Bookmark[] {
  return list.filter((b) => {
    if (f.tag && !b.tags.includes(f.tag)) return false;
    if (!matchesQuery(b, f.query)) return false;
    return true;
  });
}

/**
 * Distinct tags across bookmarks, ranked recent-first: a tag's recency is the
 * newest createdAt of any bookmark carrying it, with frequency then name as
 * tie-breaks. The plan calls for a recent-first chip row.
 */
export function allTags(list: Bookmark[]): string[] {
  const recency = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const b of list) {
    for (const t of b.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      const prev = recency.get(t);
      if (!prev || b.createdAt > prev) recency.set(t, b.createdAt);
    }
  }
  return [...counts.keys()].sort((a, b) => {
    const ra = recency.get(a) ?? "";
    const rb = recency.get(b) ?? "";
    if (ra !== rb) return rb.localeCompare(ra);
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;
    return cb - ca || a.localeCompare(b);
  });
}
