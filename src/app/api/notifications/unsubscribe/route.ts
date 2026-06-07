import { createAdminSupabase } from "@/lib/supabase/admin";
import { verify } from "@/lib/notify/tokens";

export const dynamic = "force-dynamic";

/** One-click unsubscribe from an email link. The token is HMAC-signed and
 *  round-trips via the client, so it's verified before any write; a valid token
 *  only ever flips email_enabled off. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const payload = verify(token);
  if (!payload) return new Response("Invalid or expired link.", { status: 400 });

  const admin = createAdminSupabase();
  await admin.from("notification_prefs").update({ email_enabled: false }).eq("user_id", payload.userId);

  return new Response("You've been unsubscribed from Cubemetrics emails.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
