import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { InboxView } from "./InboxView";

export const dynamic = "force-dynamic";

export interface InboxItem {
  id: number;
  text: string;
  created_at: string;
}

function ageLabel(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function InboxPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: items } = await supabase
    .from("inbox_items")
    .select("id, text, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (items || []) as InboxItem[];
  const oldest = rows.length ? ageLabel(rows[rows.length - 1].created_at) : null;

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Inbox">
      <InboxView
        items={rows.map((r) => ({ ...r, age: ageLabel(r.created_at) }))}
        oldest={oldest}
      />
    </Shell>
  );
}
