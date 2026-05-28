import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { NewEntryForm } from "./NewEntryForm";

export const dynamic = "force-dynamic";

export default async function NewEntryPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <Shell back={{ href: "/app/journal", label: "Journal" }} title="New entry">
      <NewEntryForm />
    </Shell>
  );
}
