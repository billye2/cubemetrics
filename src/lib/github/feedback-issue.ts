import { getApp } from "@/lib/modern/catalog";

export interface FeedbackIssueInput {
  category: string;
  body: string;
  appId: string | null;
  handle?: string | null;
}

export interface FeedbackIssue {
  title: string;
  body: string;
  labels: string[];
}

/**
 * Pure formatter that turns a feedback row into the GitHub issue we open when
 * an admin approves it. Kept free of I/O so it can be unit-tested directly.
 * The body includes an `@claude` mention so the Claude Code GitHub app picks
 * it up once the issue is created.
 */
export function buildFeedbackIssue(input: FeedbackIssueInput): FeedbackIssue {
  const app = input.appId ? getApp(input.appId) : undefined;
  const appLabel = app?.name ?? input.appId ?? "general";
  const firstLine = (input.body.split("\n")[0] || "").trim().slice(0, 60) || "feedback";
  const title = `[${input.category}] ${appLabel}: ${firstLine}`;

  const quoted = input.body.replace(/\n/g, "\n> ");
  const body = [
    `**App:** ${app ? `${app.name} (\`${input.appId}\`)` : input.appId ?? "general"}`,
    `**Type:** ${input.category}`,
    input.handle ? `**Submitted by:** ${input.handle}` : null,
    "",
    `> ${quoted}`,
    "",
    "---",
    "",
    "@claude please implement this approved feedback.",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  const labels = Array.from(new Set(["feedback", input.category])).filter(Boolean);
  return { title, body, labels };
}
