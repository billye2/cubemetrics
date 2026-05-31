// Pure logic for the Contacts personal CRM. No React, no Supabase — everything
// here is unit-tested in tests/unit/contacts-lib.test.ts.

export interface ContactRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  note: string | null;
  tags: string[] | null;
  cadence_days: number | null;
  last_contacted: string | null; // YYYY-MM-DD
  birthday: string | null; // YYYY-MM-DD
  created_at: string;
}

/** A row from public.contact_log — one logged interaction with a contact. */
export interface ContactLogRow {
  id: number;
  contact_id: number;
  note: string | null;
  logged_on: string | null; // YYYY-MM-DD
  created_at: string;
}

/** A normalised interaction-history entry attached to a contact. */
export interface ContactLog {
  id: number;
  contactId: number;
  note: string;
  loggedOn: string; // YYYY-MM-DD
}

/** Outreach status relative to a contact's cadence. */
export type Status = "due" | "soon" | "ok" | "none";

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  note: string | null;
  tags: string[];
  cadenceDays: number | null;
  lastContacted: string | null;
  birthday: string | null;
  createdAt: string;
  // Derived cadence fields.
  status: Status;
  dueIn: number | null; // days until next due (negative = overdue); null when no cadence
  cadenceLabel: string;
}

const RANK: Record<Status, number> = { due: 0, soon: 1, ok: 2, none: 3 };

export function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function fmtSpan(days: number): string {
  const n = Math.abs(days);
  if (n >= 365) return `${Math.round(n / 365)}y`;
  if (n >= 60) return `${Math.round(n / 30)}mo`;
  if (n >= 14) return `${Math.round(n / 7)}w`;
  return `${n}d`;
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

/** Compute cadence status for a contact given "today" (defaults to now). */
export function cadenceStatus(
  cadenceDays: number | null,
  lastContacted: string | null,
  today: Date = startOfToday(),
): { status: Status; dueIn: number | null; cadenceLabel: string } {
  if (!cadenceDays || cadenceDays <= 0) {
    if (lastContacted) {
      const ago = dayDiff(parseDate(lastContacted), today);
      const label = ago <= 0 ? "contacted today" : `last contact ${fmtSpan(ago)} ago`;
      return { status: "none", dueIn: null, cadenceLabel: label };
    }
    return { status: "none", dueIn: null, cadenceLabel: "no cadence" };
  }

  if (!lastContacted) {
    return { status: "due", dueIn: 0, cadenceLabel: "never contacted" };
  }

  const nextDue = parseDate(lastContacted);
  nextDue.setDate(nextDue.getDate() + cadenceDays);
  const dueIn = dayDiff(today, nextDue);

  if (dueIn <= 0) {
    return {
      status: "due",
      dueIn,
      cadenceLabel: dueIn === 0 ? "due today" : `${fmtSpan(dueIn)} overdue`,
    };
  }
  return {
    status: dueIn <= 7 ? "soon" : "ok",
    dueIn,
    cadenceLabel: `due in ${fmtSpan(dueIn)}`,
  };
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Normalise a DB row into a derived Contact view model. */
export function toContact(row: ContactRow, today: Date = startOfToday()): Contact {
  const cadenceDays = row.cadence_days ?? null;
  const lastContacted = cleanStr(row.last_contacted);
  const { status, dueIn, cadenceLabel } = cadenceStatus(cadenceDays, lastContacted, today);
  return {
    id: row.id,
    name: row.name,
    email: cleanStr(row.email),
    phone: cleanStr(row.phone),
    company: cleanStr(row.company),
    note: cleanStr(row.note),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    cadenceDays,
    lastContacted,
    birthday: cleanStr(row.birthday),
    createdAt: row.created_at,
    status,
    dueIn,
    cadenceLabel,
  };
}

/** Free-text search across name, company, email, phone, note and tags. Every term must match. */
export function matchesQuery(c: Contact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [c.name, c.company, c.email, c.phone, c.note, c.tags.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

export interface Filters {
  query: string;
  tag: string | null;
}

export function applyFilters(list: Contact[], f: Filters): Contact[] {
  return list.filter((c) => {
    if (f.tag && !c.tags.includes(f.tag)) return false;
    if (!matchesQuery(c, f.query)) return false;
    return true;
  });
}

/** Distinct tags across contacts, ranked by frequency then alphabetically. */
export function allTags(list: Contact[]): string[] {
  const counts = new Map<string, number>();
  for (const c of list) {
    for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);
}

/** People you're overdue (or due soon) to reach out to, most-overdue first. */
export function overdue(list: Contact[]): Contact[] {
  return list
    .filter((c) => c.status === "due")
    .sort((a, b) => (a.dueIn ?? 0) - (b.dueIn ?? 0) || a.name.localeCompare(b.name));
}

/** Sort the address book: caught-up status order, then name. */
export function sortContacts(list: Contact[]): Contact[] {
  return [...list].sort(
    (a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name),
  );
}

/** Days until a contact's next birthday (0 = today). null when no birthday set. */
export function daysUntilBirthday(birthday: string | null, today: Date = startOfToday()): number | null {
  if (!birthday) return null;
  const bd = parseDate(birthday);
  let next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  if (dayDiff(today, next) < 0) {
    next = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
  }
  return dayDiff(today, next);
}

/** Upcoming birthdays within `withinDays`, soonest first. */
export function upcomingBirthdays(
  list: Contact[],
  withinDays = 30,
  today: Date = startOfToday(),
): { contact: Contact; inDays: number }[] {
  const out: { contact: Contact; inDays: number }[] = [];
  for (const c of list) {
    const inDays = daysUntilBirthday(c.birthday, today);
    if (inDays !== null && inDays <= withinDays) out.push({ contact: c, inDays });
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}

export const CADENCE_OPTIONS = [
  { v: 0, label: "No cadence" },
  { v: 7, label: "Weekly" },
  { v: 14, label: "Biweekly" },
  { v: 30, label: "Monthly" },
  { v: 90, label: "Quarterly" },
  { v: 180, label: "Twice a year" },
  { v: 365, label: "Yearly" },
] as const;

export function cleanCadence(days: number): number | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.min(Math.floor(days), 3650);
}

// ── Interaction history (P3) ───────────────────────────────────────────────

/** Normalise a contact_log DB row into a view model. */
export function toLog(row: ContactLogRow): ContactLog {
  return {
    id: row.id,
    contactId: row.contact_id,
    note: (row.note ?? "").trim(),
    loggedOn: cleanStr(row.logged_on) ?? row.created_at.slice(0, 10),
  };
}

/**
 * Group interaction logs by contact id, newest-first, capped at `limit` per
 * contact. Rows are assumed to arrive newest-first (created_at DESC) but we sort
 * defensively by loggedOn then id so order is deterministic regardless.
 */
export function logsByContact(
  rows: ContactLog[],
  limit = 3,
): Map<number, ContactLog[]> {
  const out = new Map<number, ContactLog[]>();
  const sorted = [...rows].sort(
    (a, b) => b.loggedOn.localeCompare(a.loggedOn) || b.id - a.id,
  );
  for (const log of sorted) {
    const list = out.get(log.contactId) ?? [];
    if (list.length < limit) {
      list.push(log);
      out.set(log.contactId, list);
    }
  }
  return out;
}

/** Human "5d ago" / "today" / "yesterday" label for a YYYY-MM-DD log date. */
export function logAgo(loggedOn: string, today: Date = startOfToday()): string {
  const ago = dayDiff(parseDate(loggedOn), today);
  if (ago <= 0) return "today";
  if (ago === 1) return "yesterday";
  return `${fmtSpan(ago)} ago`;
}

/**
 * A ready-to-edit check-in opener for a contact. Mentions the most recent
 * interaction when we have one so the nudge feels personal rather than canned.
 */
export function draftCheckIn(contact: Contact, recent?: ContactLog | null): string {
  const first = contact.name.trim().split(/\s+/)[0] || contact.name.trim();
  if (recent && recent.note) {
    return `Hey ${first}, been meaning to follow up since we last talked about ${recent.note.toLowerCase()} — how are things?`;
  }
  return `Hey ${first}, it's been a while — thinking of you and wanted to check in. How have you been?`;
}
