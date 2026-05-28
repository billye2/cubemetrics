import { describe, it, expect } from "vitest";
import { buildFeedbackIssue } from "@/lib/github/feedback-issue";
import { getApp } from "@/lib/modern/catalog";

const TODO = getApp("todo")!;

describe("buildFeedbackIssue", () => {
  it("titles with category, known app name, and the first line of the body", () => {
    const { title } = buildFeedbackIssue({
      category: "feature",
      body: "Add dark mode\nmore detail here",
      appId: "todo",
    });
    expect(title).toBe(`[feature] ${TODO.name}: Add dark mode`);
  });

  it("includes app, type, handle, quoted body and the @claude trigger", () => {
    const { body } = buildFeedbackIssue({
      category: "bug",
      body: "line one\nline two",
      appId: "todo",
      handle: "alice",
    });
    expect(body).toContain(`**App:** ${TODO.name} (\`todo\`)`);
    expect(body).toContain("**Type:** bug");
    expect(body).toContain("**Submitted by:** alice");
    expect(body).toContain("> line one\n> line two");
    expect(body).toContain("@claude please implement this approved feedback.");
  });

  it("omits the submitter line and uses 'general' when there is no handle/app", () => {
    const { body } = buildFeedbackIssue({ category: "other", body: "x", appId: null });
    expect(body).not.toContain("Submitted by");
    expect(body).toContain("**App:** general");
  });

  it("labels are de-duped: feedback + category", () => {
    expect(buildFeedbackIssue({ category: "bug", body: "x", appId: null }).labels).toEqual([
      "feedback",
      "bug",
    ]);
  });

  it("falls back to a placeholder first line for an empty body", () => {
    const { title } = buildFeedbackIssue({ category: "other", body: "\n\n", appId: null });
    expect(title).toBe("[other] general: feedback");
  });

  it("truncates the first line to 60 chars", () => {
    const { title } = buildFeedbackIssue({ category: "feature", body: "a".repeat(100), appId: null });
    expect(title).toBe(`[feature] general: ${"a".repeat(60)}`);
  });

  it("uses the raw appId when it is not in the catalog", () => {
    const { title, body } = buildFeedbackIssue({ category: "feature", body: "hi", appId: "ghost" });
    expect(title).toBe("[feature] ghost: hi");
    expect(body).toContain("**App:** ghost");
  });
});
