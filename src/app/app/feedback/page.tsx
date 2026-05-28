import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { FeedbackView } from "./FeedbackView";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: mine } = await supabase
    .from("user_feedback")
    .select("id, category, body, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: board } = await supabase
    .from("user_feedback")
    .select("id, category, body, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Feedback">
      <FeedbackView mine={mine || []} board={board || []} />
    </Shell>
  );
}
