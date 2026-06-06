import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { AssistantChat } from "./AssistantChat";

export const dynamic = "force-dynamic";

/**
 * The +XP assistant — a chat/voice surface that logs entries into the mini-apps via
 * Haiku tool-calling (src/lib/agent/run.ts). Reached from the center bottom-nav tab.
 */
export default async function AssistantPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <Shell back={{ href: "/today", label: "Today" }} title="+XP">
      <p className="mb-4 text-sm text-zinc-400">
        Quick-capture by chat or voice — tell it what you did and it logs to the right app.
      </p>
      <AssistantChat />
    </Shell>
  );
}
