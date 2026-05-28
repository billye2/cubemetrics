import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/modern/admin";
import { Shell } from "@/components/modern/Shell";
import { FeedbackView, type PendingFeedback } from "./FeedbackView";

export const dynamic = "force-dynamic";

const SELECT = "id, category, body, status, app_id, github_issue_url, created_at";

export default async function FeedbackPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: mine } = await supabase
    .from("user_feedback")
    .select(SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: board } = await supabase
    .from("user_feedback")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(50);

  const admin = isAdmin(user.email);
  let pending: PendingFeedback[] = [];
  if (admin) {
    try {
      const sb = createAdminSupabase();
      const { data } = await sb
        .from("user_feedback")
        .select(`${SELECT}, user_id`)
        .eq("status", "new")
        .order("created_at", { ascending: true })
        .limit(100);
      const rows = (data || []) as (PendingFeedback & { user_id: string })[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const handles: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await sb.from("profiles").select("id, handle").in("id", ids);
        for (const p of profs || []) handles[p.id] = p.handle;
      }
      pending = rows.map((r) => ({ ...r, handle: handles[r.user_id] ?? null }));
    } catch {
      // Service role not configured / unreachable — degrade to no review queue.
      pending = [];
    }
  }

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Feedback">
      <FeedbackView mine={mine || []} board={board || []} isAdmin={admin} pending={pending} />
    </Shell>
  );
}
