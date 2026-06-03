"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/modern/admin";
import { createIssue } from "@/lib/github/issues";
import { buildFeedbackIssue } from "@/lib/github/feedback-issue";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.email))) throw new Error("Not authorized");
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

    const { title, body, labels } = buildFeedbackIssue({
      category: fb.category,
      body: fb.body,
      appId: fb.app_id,
      handle,
    });
    const issue = await createIssue({ title, body, labels });

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
