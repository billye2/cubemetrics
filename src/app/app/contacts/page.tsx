import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ContactsView } from "./ContactsView";
import { toContact, sortContacts, type ContactRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("contacts")
    .select(
      "id, name, email, phone, company, note, tags, cadence_days, last_contacted, birthday, created_at",
    )
    .eq("user_id", user.id)
    .order("name", { ascending: true })
    .limit(1000);

  const contacts = sortContacts((data as ContactRow[] | null ?? []).map((r) => toContact(r)));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Contacts">
      <ContactsView contacts={contacts} />
    </Shell>
  );
}
