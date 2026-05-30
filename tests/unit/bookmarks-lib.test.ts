import { describe, it, expect } from "vitest";
import {
  type Bookmark,
  type BookmarkRow,
  allTags,
  applyFilters,
  deriveTitle,
  faviconFor,
  hostOf,
  matchesQuery,
  normalizeUrl,
  parseTags,
  toBookmark,
} from "@/app/app/bookmarks/lib";

function row(over: Partial<BookmarkRow>): BookmarkRow {
  return {
    id: 1,
    url: "https://example.com",
    title: null,
    tags: [],
    folder: null,
    favicon_url: null,
    last_opened_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function bm(over: Partial<Bookmark>): Bookmark {
  return {
    id: 1,
    url: "https://example.com",
    title: "Example",
    tags: [],
    folder: null,
    faviconUrl: null,
    lastOpenedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    host: "example.com",
    ...over,
  };
}

describe("normalizeUrl", () => {
  it("adds https:// when no scheme present", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });
  it("preserves an existing scheme", () => {
    expect(normalizeUrl("http://example.com/x")).toBe("http://example.com/x");
  });
  it("trims surrounding whitespace", () => {
    expect(normalizeUrl("  example.com/path  ")).toBe("https://example.com/path");
  });
  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
  it("rejects non-http(s) schemes", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("ftp://example.com")).toBeNull();
  });
  it("rejects hosts without a dot", () => {
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("hostOf", () => {
  it("strips a leading www.", () => {
    expect(hostOf("https://www.example.com/page")).toBe("example.com");
  });
  it("keeps subdomains other than www", () => {
    expect(hostOf("https://blog.example.com")).toBe("blog.example.com");
  });
});

describe("deriveTitle", () => {
  it("uses the last path segment, de-slugified", () => {
    expect(deriveTitle("https://example.com/posts/my-great-article")).toBe("my great article");
  });
  it("strips a file extension", () => {
    expect(deriveTitle("https://example.com/docs/report.pdf")).toBe("report");
  });
  it("falls back to the host when there is no path", () => {
    expect(deriveTitle("https://www.example.com/")).toBe("example.com");
  });
});

describe("faviconFor", () => {
  it("builds a google favicon URL for the host", () => {
    expect(faviconFor("https://www.example.com/x")).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    );
  });
});

describe("parseTags", () => {
  it("trims, lowercases, strips #, and de-dupes", () => {
    expect(parseTags("Work, #Work , news,, NEWS")).toEqual(["work", "news"]);
  });
  it("caps at 12 tags", () => {
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`).join(",");
    expect(parseTags(many)).toHaveLength(12);
  });
});

describe("toBookmark", () => {
  it("derives a title when none is stored", () => {
    expect(toBookmark(row({ url: "https://example.com/the-page" })).title).toBe("the page");
  });
  it("prefers a stored title", () => {
    expect(toBookmark(row({ title: "Custom" })).title).toBe("Custom");
  });
  it("normalises null tags to an empty array", () => {
    expect(toBookmark(row({ tags: null })).tags).toEqual([]);
  });
  it("computes the host", () => {
    expect(toBookmark(row({ url: "https://www.example.com" })).host).toBe("example.com");
  });
});

describe("matchesQuery", () => {
  const b = bm({ title: "React Docs", url: "https://react.dev/learn", host: "react.dev", tags: ["frontend"] });
  it("matches on title", () => {
    expect(matchesQuery(b, "react")).toBe(true);
  });
  it("matches on tag", () => {
    expect(matchesQuery(b, "frontend")).toBe(true);
  });
  it("matches on host", () => {
    expect(matchesQuery(b, "react.dev")).toBe(true);
  });
  it("requires every term to match", () => {
    expect(matchesQuery(b, "react frontend")).toBe(true);
    expect(matchesQuery(b, "react backend")).toBe(false);
  });
  it("empty query matches everything", () => {
    expect(matchesQuery(b, "  ")).toBe(true);
  });
});

describe("applyFilters", () => {
  const list = [
    bm({ id: 1, title: "Alpha", url: "https://alpha.test", host: "alpha.test", tags: ["work"] }),
    bm({ id: 2, title: "Bravo", url: "https://bravo.test", host: "bravo.test", tags: ["fun"] }),
    bm({ id: 3, title: "Charlie", url: "https://charlie.test", host: "charlie.test", tags: ["work", "fun"] }),
  ];
  it("filters by tag", () => {
    expect(applyFilters(list, { query: "", tag: "work" }).map((b) => b.id)).toEqual([1, 3]);
  });
  it("combines tag and query", () => {
    expect(applyFilters(list, { query: "charlie", tag: "fun" }).map((b) => b.id)).toEqual([3]);
  });
  it("no filters returns all", () => {
    expect(applyFilters(list, { query: "", tag: null })).toHaveLength(3);
  });
});

describe("allTags", () => {
  it("ranks recent-first by newest carrying bookmark", () => {
    const list = [
      bm({ id: 1, tags: ["old"], createdAt: "2026-01-01T00:00:00Z" }),
      bm({ id: 2, tags: ["new"], createdAt: "2026-05-01T00:00:00Z" }),
    ];
    expect(allTags(list)).toEqual(["new", "old"]);
  });
  it("de-dupes tags across bookmarks", () => {
    const list = [
      bm({ id: 1, tags: ["a", "b"], createdAt: "2026-01-01T00:00:00Z" }),
      bm({ id: 2, tags: ["a"], createdAt: "2026-02-01T00:00:00Z" }),
    ];
    expect(allTags(list).sort()).toEqual(["a", "b"]);
  });
});
