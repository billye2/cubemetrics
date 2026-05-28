import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createIssue } from "@/lib/github/issues";

// Minimal fetch Response stand-in (avoids relying on the global Response).
function res(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => (typeof payload === "string" ? payload : JSON.stringify(payload)),
  };
}

describe("createIssue", () => {
  const ENV = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "tok";
    process.env.GITHUB_REPO = "owner/repo";
  });

  afterEach(() => {
    process.env = { ...ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when the token is missing", async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(createIssue({ title: "t", body: "b" })).rejects.toThrow(/GITHUB_TOKEN/);
  });

  it("validates the GITHUB_REPO format", async () => {
    process.env.GITHUB_REPO = "not-a-repo";
    await expect(createIssue({ title: "t", body: "b" })).rejects.toThrow(/Invalid GITHUB_REPO/);
  });

  it("POSTs to the configured repo with auth + JSON payload, returns number/url", async () => {
    const fetchMock = vi.fn(async () => res(201, { number: 7, html_url: "https://github.com/o/r/issues/7" }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await createIssue({ title: "T", body: "B", labels: ["feedback", "bug"] });
    expect(out).toEqual({ number: 7, url: "https://github.com/o/r/issues/7" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe("https://api.github.com/repos/owner/repo/issues");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer tok");
    expect(opts.headers.Accept).toBe("application/vnd.github+json");
    expect(JSON.parse(opts.body as string)).toEqual({ title: "T", body: "B", labels: ["feedback", "bug"] });
  });

  it("throws with status + detail on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(422, "Validation failed")));
    await expect(createIssue({ title: "t", body: "b" })).rejects.toThrow(/422.*Validation failed/);
  });
});
