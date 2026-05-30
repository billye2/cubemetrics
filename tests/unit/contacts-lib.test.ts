import { describe, it, expect } from "vitest";
import {
  type Contact,
  type ContactRow,
  allTags,
  applyFilters,
  cadenceStatus,
  cleanCadence,
  daysUntilBirthday,
  matchesQuery,
  overdue,
  parseTags,
  sortContacts,
  toContact,
  upcomingBirthdays,
} from "@/app/app/contacts/lib";

const TODAY = new Date(2026, 4, 30); // 2026-05-30

function row(over: Partial<ContactRow>): ContactRow {
  return {
    id: 1,
    name: "Alex",
    email: null,
    phone: null,
    company: null,
    note: null,
    tags: [],
    cadence_days: null,
    last_contacted: null,
    birthday: null,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function contact(over: Partial<Contact>): Contact {
  return {
    id: 1,
    name: "Alex",
    email: null,
    phone: null,
    company: null,
    note: null,
    tags: [],
    cadenceDays: null,
    lastContacted: null,
    birthday: null,
    createdAt: "2026-01-01T00:00:00Z",
    status: "none",
    dueIn: null,
    cadenceLabel: "no cadence",
    ...over,
  };
}

describe("parseTags", () => {
  it("trims, lowercases, strips #, de-dupes", () => {
    expect(parseTags("Family, #Work ,family,  Friends")).toEqual(["family", "work", "friends"]);
  });
  it("ignores empties and caps at 12", () => {
    expect(parseTags(",,  ,")).toEqual([]);
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`).join(",");
    expect(parseTags(many).length).toBe(12);
  });
});

describe("cleanCadence", () => {
  it("nulls non-positive, floors and caps", () => {
    expect(cleanCadence(0)).toBeNull();
    expect(cleanCadence(-5)).toBeNull();
    expect(cleanCadence(NaN)).toBeNull();
    expect(cleanCadence(30.9)).toBe(30);
    expect(cleanCadence(99999)).toBe(3650);
  });
});

describe("cadenceStatus", () => {
  it("no cadence + no contact => none/no cadence", () => {
    expect(cadenceStatus(null, null, TODAY)).toEqual({
      status: "none",
      dueIn: null,
      cadenceLabel: "no cadence",
    });
  });
  it("no cadence but logged shows last-contact label", () => {
    const r = cadenceStatus(0, "2026-05-16", TODAY); // 14 days ago
    expect(r.status).toBe("none");
    expect(r.cadenceLabel).toBe("last contact 2w ago");
  });
  it("cadence + never contacted => due", () => {
    expect(cadenceStatus(30, null, TODAY)).toEqual({
      status: "due",
      dueIn: 0,
      cadenceLabel: "never contacted",
    });
  });
  it("overdue when last contact older than cadence", () => {
    const r = cadenceStatus(30, "2026-04-01", TODAY); // due 2026-05-01, 29d overdue
    expect(r.status).toBe("due");
    expect(r.dueIn).toBeLessThan(0);
    expect(r.cadenceLabel).toContain("overdue");
  });
  it("soon within 7 days, ok beyond", () => {
    expect(cadenceStatus(30, "2026-05-10", TODAY).status).toBe("ok"); // due 6/9, 10d
    expect(cadenceStatus(30, "2026-05-05", TODAY).status).toBe("soon"); // due 6/4, 5d
  });
});

describe("toContact", () => {
  it("normalises blanks to null and derives cadence", () => {
    const c = toContact(
      row({ email: "  ", phone: "555", tags: ["work"], cadence_days: 30, last_contacted: "2026-04-01" }),
      TODAY,
    );
    expect(c.email).toBeNull();
    expect(c.phone).toBe("555");
    expect(c.tags).toEqual(["work"]);
    expect(c.status).toBe("due");
  });
});

describe("matchesQuery", () => {
  const c = contact({
    name: "Maria Lopez",
    company: "Acme",
    email: "maria@acme.com",
    phone: "555-1234",
    note: "met at conf",
    tags: ["work", "speaker"],
  });
  it("matches across fields, every term required", () => {
    expect(matchesQuery(c, "")).toBe(true);
    expect(matchesQuery(c, "maria")).toBe(true);
    expect(matchesQuery(c, "acme")).toBe(true);
    expect(matchesQuery(c, "1234")).toBe(true);
    expect(matchesQuery(c, "speaker")).toBe(true);
    expect(matchesQuery(c, "maria acme")).toBe(true);
    expect(matchesQuery(c, "maria nope")).toBe(false);
  });
});

describe("applyFilters", () => {
  const list = [
    contact({ id: 1, name: "A", tags: ["family"] }),
    contact({ id: 2, name: "B", tags: ["work"] }),
    contact({ id: 3, name: "Carmen", tags: ["work", "family"] }),
  ];
  it("filters by tag and query together", () => {
    expect(applyFilters(list, { query: "", tag: "family" }).map((c) => c.id)).toEqual([1, 3]);
    expect(applyFilters(list, { query: "car", tag: null }).map((c) => c.id)).toEqual([3]);
    expect(applyFilters(list, { query: "car", tag: "family" }).map((c) => c.id)).toEqual([3]);
  });
});

describe("allTags", () => {
  it("ranks by frequency then alpha", () => {
    const list = [
      contact({ tags: ["a", "b"] }),
      contact({ tags: ["a"] }),
      contact({ tags: ["a", "c"] }),
    ];
    expect(allTags(list)).toEqual(["a", "b", "c"]);
  });
});

describe("overdue / sortContacts", () => {
  const list = [
    contact({ id: 1, name: "Ok", status: "ok", dueIn: 10 }),
    contact({ id: 2, name: "VeryLate", status: "due", dueIn: -20 }),
    contact({ id: 3, name: "JustDue", status: "due", dueIn: -1 }),
    contact({ id: 4, name: "None", status: "none" }),
  ];
  it("overdue most-overdue first", () => {
    expect(overdue(list).map((c) => c.id)).toEqual([2, 3]);
  });
  it("sortContacts orders by status rank then name", () => {
    // due first (JustDue, VeryLate by name), then ok, then none.
    expect(sortContacts(list).map((c) => c.id)).toEqual([3, 2, 1, 4]);
  });
});

describe("birthdays", () => {
  it("daysUntilBirthday handles this-year and roll-over", () => {
    expect(daysUntilBirthday("1990-05-30", TODAY)).toBe(0);
    expect(daysUntilBirthday("1990-06-02", TODAY)).toBe(3);
    expect(daysUntilBirthday("1990-05-29", TODAY)).toBe(364); // already passed -> next year
    expect(daysUntilBirthday(null, TODAY)).toBeNull();
  });
  it("upcomingBirthdays within window, soonest first", () => {
    const list = [
      contact({ id: 1, birthday: "1990-06-02" }), // 3d
      contact({ id: 2, birthday: "1990-12-25" }), // far
      contact({ id: 3, birthday: "1990-05-30" }), // today
    ];
    expect(upcomingBirthdays(list, 30, TODAY).map((b) => b.contact.id)).toEqual([3, 1]);
  });
});
