import { describe, it, expect } from "vitest";
import {
  type FileEntry,
  type FileEntryRow,
  UNFILED_LABEL,
  allTags,
  allTypes,
  applyFilters,
  formatSize,
  groupByLocation,
  isUrl,
  matchesQuery,
  parseImport,
  parseTags,
  sortEntries,
  toFileEntry,
} from "@/app/app/fileindex/lib";

function entry(over: Partial<FileEntry>): FileEntry {
  return {
    id: 1,
    name: "File",
    location: null,
    type: null,
    tags: [],
    sizeBytes: null,
    fileDate: null,
    description: null,
    lastVerified: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("toFileEntry", () => {
  it("normalises a null tags array to []", () => {
    const row: FileEntryRow = {
      id: 5,
      name: "Scan",
      location: "/box/3",
      type: "doc",
      tags: null,
      size_bytes: 1024,
      file_date: "2026-02-02",
      description: null,
      last_verified: "2026-03-03",
      created_at: "2026-02-02T00:00:00Z",
    };
    const e = toFileEntry(row);
    expect(e.tags).toEqual([]);
    expect(e.sizeBytes).toBe(1024);
    expect(e.fileDate).toBe("2026-02-02");
    expect(e.lastVerified).toBe("2026-03-03");
  });
});

describe("parseTags", () => {
  it("splits, trims, lowercases, strips #, de-dupes", () => {
    expect(parseTags("Tax, #2025 ,tax,  Receipts")).toEqual(["tax", "2025", "receipts"]);
  });
  it("ignores empties and caps at 20", () => {
    expect(parseTags(",,  ,")).toEqual([]);
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(",");
    expect(parseTags(many).length).toBe(20);
  });
});

describe("formatSize", () => {
  it("formats common magnitudes", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1024)).toBe("1 KB");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5 MB");
  });
  it("returns empty string for unknown/invalid", () => {
    expect(formatSize(null)).toBe("");
    expect(formatSize(undefined)).toBe("");
    expect(formatSize(-1)).toBe("");
  });
});

describe("isUrl", () => {
  it("detects http(s) urls only", () => {
    expect(isUrl("https://drive.google.com/x")).toBe(true);
    expect(isUrl("http://example.com")).toBe(true);
    expect(isUrl("C:/Users/me/file.pdf")).toBe(false);
    expect(isUrl("/box/3")).toBe(false);
    expect(isUrl(null)).toBe(false);
  });
});

describe("matchesQuery", () => {
  const e = entry({
    name: "Tax return",
    location: "/cabinet/A",
    type: "doc",
    description: "filed late",
    tags: ["2025", "irs"],
  });
  it("matches across all fields and requires every term", () => {
    expect(matchesQuery(e, "")).toBe(true);
    expect(matchesQuery(e, "tax")).toBe(true);
    expect(matchesQuery(e, "cabinet")).toBe(true);
    expect(matchesQuery(e, "irs")).toBe(true);
    expect(matchesQuery(e, "tax irs")).toBe(true);
    expect(matchesQuery(e, "tax nope")).toBe(false);
  });
});

describe("applyFilters", () => {
  const list = [
    entry({ id: 1, name: "A", type: "doc", tags: ["x"] }),
    entry({ id: 2, name: "B", type: "photo", tags: ["y"] }),
    entry({ id: 3, name: "C", type: "doc", tags: ["x", "y"] }),
  ];
  it("filters by tag and type together", () => {
    expect(applyFilters(list, { query: "", tag: "x", type: null }).map((e) => e.id)).toEqual([1, 3]);
    expect(applyFilters(list, { query: "", tag: null, type: "doc" }).map((e) => e.id)).toEqual([1, 3]);
    expect(applyFilters(list, { query: "", tag: "y", type: "doc" }).map((e) => e.id)).toEqual([3]);
  });
});

describe("sortEntries", () => {
  const list = [
    entry({ id: 1, name: "banana", type: "photo", fileDate: "2026-01-01", createdAt: "2026-03-01T00:00:00Z" }),
    entry({ id: 2, name: "apple", type: "doc", fileDate: "2026-05-01", createdAt: "2026-01-01T00:00:00Z" }),
    entry({ id: 3, name: "cherry", type: null, fileDate: null, createdAt: "2026-02-01T00:00:00Z" }),
  ];
  it("sorts by name", () => {
    expect(sortEntries(list, "name").map((e) => e.id)).toEqual([2, 1, 3]);
  });
  it("sorts by file date desc, undated last", () => {
    expect(sortEntries(list, "date").map((e) => e.id)).toEqual([2, 1, 3]);
  });
  it("sorts by added (created_at) desc", () => {
    expect(sortEntries(list, "added").map((e) => e.id)).toEqual([1, 3, 2]);
  });
  it("sorts by type, untyped last", () => {
    expect(sortEntries(list, "type").map((e) => e.id)).toEqual([2, 1, 3]);
  });
});

describe("allTags / allTypes", () => {
  const list = [
    entry({ tags: ["a", "b"], type: "doc" }),
    entry({ tags: ["a"], type: "photo" }),
    entry({ tags: ["a", "c"], type: "doc" }),
  ];
  it("ranks tags by frequency then alpha", () => {
    expect(allTags(list)).toEqual(["a", "b", "c"]);
  });
  it("lists distinct types alpha", () => {
    expect(allTypes(list)).toEqual(["doc", "photo"]);
  });
});

describe("groupByLocation", () => {
  const list = [
    entry({ id: 1, location: "/box/A" }),
    entry({ id: 2, location: "/box/B" }),
    entry({ id: 3, location: "/box/A" }),
    entry({ id: 4, location: null }),
    entry({ id: 5, location: "/box/A" }),
  ];
  it("groups with counts, biggest first, Unfiled last", () => {
    const groups = groupByLocation(list);
    expect(groups.map((g) => [g.location, g.count])).toEqual([
      ["/box/A", 3],
      ["/box/B", 1],
      [null, 1],
    ]);
    expect(groups[2].location).toBeNull();
    expect(UNFILED_LABEL).toBe("Unfiled");
  });
  it("preserves member order within a group", () => {
    const groups = groupByLocation(list);
    expect(groups[0].entries.map((e) => e.id)).toEqual([1, 3, 5]);
  });
  it("breaks count ties alphabetically by location", () => {
    const g = groupByLocation([
      entry({ id: 1, location: "zeta" }),
      entry({ id: 2, location: "alpha" }),
    ]);
    expect(g.map((x) => x.location)).toEqual(["alpha", "zeta"]);
  });
});

describe("parseImport", () => {
  it("parses one name per line and skips blanks", () => {
    const rows = parseImport("report.pdf\n\n  notes.txt  \n");
    expect(rows).toEqual([{ name: "report.pdf" }, { name: "notes.txt" }]);
  });
  it("pulls size and date columns out of tab-separated rows", () => {
    const rows = parseImport("scan.pdf\t2048\t2026-02-02");
    expect(rows).toEqual([{ name: "scan.pdf", sizeBytes: 2048, fileDate: "2026-02-02" }]);
  });
  it("splits a path into location + basename", () => {
    expect(parseImport("/box/3/scan.pdf")).toEqual([
      { name: "scan.pdf", location: "/box/3" },
    ]);
    expect(parseImport("C:\\docs\\tax.pdf")).toEqual([
      { name: "tax.pdf", location: "C:\\docs" },
    ]);
  });
  it("keeps single spaces inside a name", () => {
    expect(parseImport("Tax Return 2025.pdf")).toEqual([{ name: "Tax Return 2025.pdf" }]);
  });
  it("uses a leading path column as the location", () => {
    const rows = parseImport("/cabinet/A    receipt.pdf");
    expect(rows).toEqual([{ name: "receipt.pdf", location: "/cabinet/A" }]);
  });
  it("caps the number of rows", () => {
    const many = Array.from({ length: 250 }, (_, i) => `f${i}.txt`).join("\n");
    expect(parseImport(many).length).toBe(200);
  });
});
