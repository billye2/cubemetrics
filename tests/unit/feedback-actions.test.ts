import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock every I/O boundary the actions touch.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/github/issues", () => ({ createIssue: vi.fn() }));

import {
  submitFeedbackAction,
  approveFeedbackAction,
  rejectFeedbackAction,
} from "@/app/app/feedback/actions";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createIssue } from "@/lib/github/issues";

const ADMIN = { id: "admin-1", email: "admin@example.com" };

// A chainable Supabase query stub: every builder method returns `this`, the
// terminal `.single()` resolves to `single`, and awaiting the chain resolves
// to `result`.
function makeQuery(single: unknown = { data: null, error: null }, result: unknown = { data: null, error: null }) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "upsert", "eq", "in", "order", "limit"]) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(async () => single);
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

function makeClient(user: unknown, query = makeQuery()) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn(() => query),
    __query: query,
  };
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("submitFeedbackAction", () => {
  it("ignores an empty body (no DB write)", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await submitFeedbackAction(fd({ body: "   " }));
    expect(client.from).not.toHaveBeenCalled();
  });

  it("inserts feedback tagged with the app", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await submitFeedbackAction(fd({ body: "Add X", category: "feature", app_id: "todo" }));
    expect(client.from).toHaveBeenCalledWith("user_feedback");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      category: "feature",
      body: "Add X",
      app_id: "todo",
    });
  });

  it("defaults category to 'other' and app_id to null", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await submitFeedbackAction(fd({ body: "hi" }));
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      category: "other",
      body: "hi",
      app_id: null,
    });
  });
});

describe("rejectFeedbackAction", () => {
  it("requires an id", async () => {
    expect(await rejectFeedbackAction(new FormData())).toEqual({ ok: false, error: "Missing id" });
  });

  it("blocks non-admins", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient({ id: "u", email: "hacker@x.com" }));
    expect(await rejectFeedbackAction(fd({ id: "5" }))).toEqual({ ok: false, error: "Not authorized" });
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("marks rejected for admins", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient(ADMIN));
    const admin = makeClient(ADMIN);
    asMock(createAdminSupabase).mockReturnValue(admin);
    expect(await rejectFeedbackAction(fd({ id: "5" }))).toEqual({ ok: true });
    expect(admin.from).toHaveBeenCalledWith("user_feedback");
    expect(admin.__query.update).toHaveBeenCalledWith({ status: "rejected" });
    expect(admin.__query.eq).toHaveBeenCalledWith("id", 5);
  });
});

describe("approveFeedbackAction", () => {
  it("blocks non-admins", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient({ id: "u", email: "hacker@x.com" }));
    expect(await approveFeedbackAction(fd({ id: "5" }))).toEqual({ ok: false, error: "Not authorized" });
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("errors when the feedback is missing", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient(ADMIN));
    asMock(createAdminSupabase).mockReturnValue(makeClient(ADMIN, makeQuery({ data: null })));
    expect(await approveFeedbackAction(fd({ id: "9" }))).toEqual({ ok: false, error: "Feedback not found" });
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("is idempotent — won't re-open already-resolved feedback", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient(ADMIN));
    asMock(createAdminSupabase).mockReturnValue(makeClient(ADMIN, makeQuery({ data: { status: "approved" } })));
    expect(await approveFeedbackAction(fd({ id: "9" }))).toEqual({ ok: false, error: "Already approved" });
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("opens a GitHub issue and records it on the row", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient(ADMIN));
    const fb = {
      id: 5,
      category: "feature",
      body: "Do X",
      app_id: "todo",
      status: "new",
      user_id: "u1",
      handle: "alice",
    };
    const admin = makeClient(ADMIN, makeQuery({ data: fb }));
    asMock(createAdminSupabase).mockReturnValue(admin);
    asMock(createIssue).mockResolvedValue({ number: 12, url: "https://github.com/o/r/issues/12" });

    const result = await approveFeedbackAction(fd({ id: "5" }));
    expect(result).toEqual({ ok: true, url: "https://github.com/o/r/issues/12" });

    expect(createIssue).toHaveBeenCalledOnce();
    const issueArg = asMock(createIssue).mock.calls[0][0] as { title: string; body: string; labels: string[] };
    expect(issueArg.title).toContain("[feature]");
    expect(issueArg.body).toContain("@claude");
    expect(issueArg.labels).toEqual(["feedback", "feature"]);

    expect(admin.__query.update).toHaveBeenCalledWith({
      status: "approved",
      github_issue_number: 12,
      github_issue_url: "https://github.com/o/r/issues/12",
    });
  });

  it("surfaces GitHub errors without marking approved", async () => {
    asMock(createServerSupabase).mockResolvedValue(makeClient(ADMIN));
    const fb = { id: 1, category: "bug", body: "x", app_id: null, status: "new", user_id: "u" };
    const admin = makeClient(ADMIN, makeQuery({ data: fb }));
    asMock(createAdminSupabase).mockReturnValue(admin);
    asMock(createIssue).mockRejectedValue(new Error("GITHUB_TOKEN is not configured"));

    expect(await approveFeedbackAction(fd({ id: "1" }))).toEqual({
      ok: false,
      error: "GITHUB_TOKEN is not configured",
    });
  });
});
