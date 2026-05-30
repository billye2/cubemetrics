import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ContactsView } from "./ContactsView";
import {
  toContact,
  toLog,
  sortContacts,
  type ContactRow,
  type ContactLog,
  type ContactLogRow,
} from "./lib";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [contactsRes, logsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id, name, email, phone, company, note, tags, cadence_days, last_contacted, birthday, created_at",
      )
      .eq("user_id", user.id)
      .order("name", { ascending: true })
      .limit(1000),
    supabase
      .from("contact_log")
      .select("id, contact_id, note, logged_on, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const contacts = sortContacts(
    ((contactsRes.data as ContactRow[] | null) ?? []).map((r) => toContact(r)),
  );
  const logs: ContactLog[] = ((logsRes.data as ContactLogRow[] | null) ?? []).map(toLog);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Contacts">
      <ContactsView contacts={contacts} logs={logs} />
    </Shell>
  );
}
