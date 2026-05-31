// Pure, testable helpers for the File Index catalog. A file-index entry is
// metadata for retrieval — name + where it lives + how to recognise it. The
// core interaction is search/filter across every text field + tags.

export interface FileEntryRow {
  id: number;
  name: string;
  location: string | null;
  type: string | null;
  tags: string[] | null;
  size_bytes: number | null;
  file_date: string | null; // YYYY-MM-DD
  description: string | null;
  last_verified: string | null; // YYYY-MM-DD — when this physical media was last confirmed
  created_at: string;
}

export interface FileEntry {
  id: number;
  name: string;
  location: string | null;
  type: string | null;
  tags: string[];
  sizeBytes: number | null;
  fileDate: string | null;
  description: string | null;
  lastVerified: string | null;
  createdAt: string;
}

export type SortKey = "name" | "date" | "type" | "added";

export function toFileEntry(row: FileEntryRow): FileEntry {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    type: row.type,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sizeBytes: row.size_bytes,
    fileDate: row.file_date,
    description: row.description,
    lastVerified: row.last_verified,
    createdAt: row.created_at,
  };
}

/** Parse a comma/space separated tag string into a clean, de-duped list. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t.slice(0, 40));
    if (out.length >= 20) break;
  }
  return out;
}

/** Human-readable byte size. Returns "" when unknown. */
export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? val : Math.round(val * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/** Best-effort: is this location a clickable URL we can open in a new tab? */
export function isUrl(location: string | null | undefined): boolean {
  if (!location) return false;
  return /^https?:\/\/\S+$/i.test(location.trim());
}

/** Filter by free-text query across every searchable field + tags. */
export function matchesQuery(entry: FileEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    entry.name,
    entry.location ?? "",
    entry.type ?? "",
    entry.description ?? "",
    entry.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export interface FilterState {
  query: string;
  tag: string | null;
  type: string | null;
}

export function applyFilters(entries: FileEntry[], f: FilterState): FileEntry[] {
  return entries.filter((e) => {
    if (!matchesQuery(e, f.query)) return false;
    if (f.tag && !e.tags.includes(f.tag)) return false;
    if (f.type && (e.type ?? "") !== f.type) return false;
    return true;
  });
}

export function sortEntries(entries: FileEntry[], key: SortKey): FileEntry[] {
  const list = [...entries];
  switch (key) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "type":
      // Untyped entries sink to the bottom; otherwise alpha by type then name.
      return list.sort((a, b) => {
        if (!a.type && !b.type) return a.name.localeCompare(b.name);
        if (!a.type) return 1;
        if (!b.type) return -1;
        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
      });
    case "date":
      // Newest file_date first; entries without a date sink to the bottom.
      return list.sort((a, b) => (b.fileDate ?? "").localeCompare(a.fileDate ?? ""));
    case "added":
    default:
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Distinct tags across the catalog, sorted by frequency then alpha. */
export function allTags(entries: FileEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);
}

/** Distinct non-empty types across the catalog, alpha sorted. */
export function allTypes(entries: FileEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) if (e.type) set.add(e.type);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export interface LocationGroup {
  /** The shared location/path, or null for entries with no recorded location. */
  location: string | null;
  count: number;
  entries: FileEntry[];
}

/** Label used for the bucket of entries that have no recorded location. */
export const UNFILED_LABEL = "Unfiled";

/**
 * Group entries by their location (drive / folder / box). Each group keeps the
 * incoming order of its members; groups are sorted by count desc, then by
 * location alpha. Entries without a location collect into a single "Unfiled"
 * bucket which always sorts last.
 */
export function groupByLocation(entries: FileEntry[]): LocationGroup[] {
  const map = new Map<string, LocationGroup>();
  for (const e of entries) {
    const key = e.location ?? "";
    let g = map.get(key);
    if (!g) {
      g = { location: e.location ?? null, count: 0, entries: [] };
      map.set(key, g);
    }
    g.count += 1;
    g.entries.push(e);
  }
  return [...map.values()].sort((a, b) => {
    // Unfiled (null location) always sinks to the bottom.
    if (a.location === null && b.location === null) return 0;
    if (a.location === null) return 1;
    if (b.location === null) return -1;
    return b.count - a.count || a.location.localeCompare(b.location);
  });
}

export interface ImportedEntry {
  name: string;
  location?: string;
  sizeBytes?: number;
  fileDate?: string;
}

/** Max rows a single bulk-import paste will yield, to keep inserts bounded. */
export const IMPORT_ROW_CAP = 200;

const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

/**
 * Parse a pasted directory listing into draft catalog rows. Tolerant of a range
 * of formats: one entry per line, columns separated by tabs or runs of 2+
 * spaces. Recognises a trailing/standalone YYYY-MM-DD as the file date and a
 * bare integer column as a byte size. Blank lines are skipped; the rightmost
 * non-numeric / non-date column is treated as the file name. A leading column
 * that looks like a path (contains a slash/backslash or a drive letter) becomes
 * the location. Output is capped at IMPORT_ROW_CAP rows.
 */
export function parseImport(text: string): ImportedEntry[] {
  const out: ImportedEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Split on tabs or runs of 2+ spaces — single spaces stay inside a name.
    const cols = line.split(/\t+| {2,}/).map((c) => c.trim()).filter(Boolean);
    if (cols.length === 0) continue;

    let fileDate: string | undefined;
    let sizeBytes: number | undefined;
    let location: string | undefined;
    const rest: string[] = [];

    for (const col of cols) {
      const dm = col.match(DATE_RE);
      if (dm && !fileDate) {
        fileDate = dm[1];
        // If the column is *only* a date, consume it; otherwise keep the remnant.
        const remnant = col.replace(DATE_RE, "").trim();
        if (remnant) rest.push(remnant);
        continue;
      }
      if (/^\d{1,15}$/.test(col) && sizeBytes === undefined) {
        sizeBytes = Number(col);
        continue;
      }
      rest.push(col);
    }

    if (rest.length === 0) {
      // Line was only a date/size with no name — skip it.
      continue;
    }

    // A column that looks like a path (slash, backslash, or drive letter) and is
    // not the only/last column becomes the location; the last column is the name.
    let name = rest[rest.length - 1];
    if (rest.length > 1) {
      const head = rest[0];
      if (/[\\/]/.test(head) || /^[A-Za-z]:/.test(head)) {
        location = head;
      }
    }

    // If the name itself carries a directory portion, split it into location +
    // basename so grouping works (e.g. "/box/3/scan.pdf" or "C:\\docs\\a.pdf").
    const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
    if (slash > 0 && !location) {
      location = name.slice(0, slash);
      name = name.slice(slash + 1);
    } else if (slash > 0 && location) {
      name = name.slice(slash + 1);
    }
    name = name.trim();
    if (!name) continue;

    const row: ImportedEntry = { name };
    if (location) row.location = location;
    if (sizeBytes !== undefined) row.sizeBytes = sizeBytes;
    if (fileDate) row.fileDate = fileDate;
    out.push(row);
    if (out.length >= IMPORT_ROW_CAP) break;
  }
  return out;
}
