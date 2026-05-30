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
