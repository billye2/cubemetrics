"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/modern/admin";
import { getApp } from "@/lib/modern/catalog";
import { createIssue } from "@/lib/github/issues";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("Not authorized");
  return user;
}

export async function submitFeedbackAction(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  const category = String(formData.get("category") || "other").trim() || "other";
  const appId = String(formData.get("app_id") || "").trim() || null;
  if (!body) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("user_feedback").insert({ user_id: userId, category, body, app_id: appId });
  revalidatePath("/app/feedback");
}

export type ReviewResult = { ok: boolean; error?: string; url?: string };

export async function rejectFeedbackAction(formData: FormData): Promise<ReviewResult> {
  const id = Number(formData.get("id"));
  if (!id) return { ok: false, error: "Missing id" };
  try {
    await requireAdmin();
    const admin = createAdminSupabase();
    await admin.from("user_feedback").update({ status: "rejected" }).eq("id", id);
    revalidatePath("/app/feedback");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reject" };
  }
}

/**
 * Approve a piece of feedback: open a GitHub issue tagged with `@claude` so the
 * Claude Code GitHub app picks it up, then mark the feedback as approved.
 */
export async function approveFeedbackAction(formData: FormData): Promise<ReviewResult> {
  const id = Number(formData.get("id"));
  if (!id) return { ok: false, error: "Missing id" };
  try {
    await requireAdmin();
    const admin = createAdminSupabase();

    const { data: fb } = await admin
      .from("user_feedback")
      .select("id, category, body, app_id, status, user_id")
      .eq("id", id)
      .single();
    if (!fb) return { ok: false, error: "Feedback not found" };
    if (fb.status !== "new") return { ok: false, error: `Already ${fb.status}` };

    // Best-effort submitter handle for context in the issue.
    const { data: profile } = await admin
      .from("profiles")
      .select("handle")
      .eq("id", fb.user_id)
      .single();
    const handle: string | null = profile?.handle ?? null;

    const app = fb.app_id ? getApp(fb.app_id) : undefined;
    const appLabel = app?.name ?? fb.app_id ?? "general";
    const firstLine = (fb.body.split("\n")[0] || "").trim().slice(0, 60) || "feedback";
    const title = `[${fb.category}] ${appLabel}: ${firstLine}`;

    const quoted = fb.body.replace(/\n/g, "\n> ");
    const issueBody = [
      `**App:** ${app ? `${app.name} (\`${fb.app_id}\`)` : fb.app_id ?? "general"}`,
      `**Type:** ${fb.category}`,
      handle ? `**Submitted by:** ${handle}` : null,
      "",
      `> ${quoted}`,
      "",
      "---",
      "",
      "@claude please implement this approved feedback.",
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

    const labels = Array.from(new Set(["feedback", fb.category])).filter(Boolean);
    const issue = await createIssue({ title, body: issueBody, labels });

    await admin
      .from("user_feedback")
      .update({
        status: "approved",
        github_issue_number: issue.number,
        github_issue_url: issue.url,
      })
      .eq("id", id);

    revalidatePath("/app/feedback");
    return { ok: true, url: issue.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to approve" };
  }
}
