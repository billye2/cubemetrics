"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/clienttracker";
export const STATUSES = ["lead", "active", "done", "lost"] as const;
type Status = (typeof STATUSES)[number];

function cleanStatus(status: string): Status {
  return (STATUSES as readonly string[]).includes(status) ? (status as Status) : "lead";
}

function cleanDate(value: string): string | null {
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function cleanValue(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export async function addClient(name: string, status: string) {
  const n = name.trim();
  if (!n) return;
  const to = cleanStatus(status);
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      name: n.slice(0, 120),
      status: to,
    })
    .select("id")
    .single();
  if (data?.id != null) {
    await supabase.from("client_events").insert({
      user_id: userId,
      client_id: data.id as number,
      kind: "created",
      to_status: to,
    });
  }
  revalidatePath(PATH);
}

export async function setStatus(id: number, status: string) {
  const to = cleanStatus(status);
  const { supabase, userId } = await requireUser();
  // Read the prior status so we can record a meaningful transition.
  const { data: prior } = await supabase
    .from("clients")
    .select("status")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  const from = (prior?.status as string) ?? "";
  if (from === to) return;
  await supabase
    .from("clients")
    .update({ status: to })
    .eq("id", id)
    .eq("user_id", userId);
  await supabase.from("client_events").insert({
    user_id: userId,
    client_id: id,
    kind: "status",
    from_status: from,
    to_status: to,
  });
  revalidatePath(PATH);
}

export async function updateClient(
  id: number,
  fields: {
    name?: string;
    email?: string;
    phone?: string;
    value?: string;
    next_action?: string;
    next_action_date?: string;
    note?: string;
    status?: string;
  },
) {
  const { supabase, userId } = await requireUser();

  const update: Record<string, string | number | null> = {};
  if (fields.name !== undefined) {
    const n = fields.name.trim();
    if (!n) return; // name is required
    update.name = n.slice(0, 120);
  }
  if (fields.email !== undefined) update.email = fields.email.trim().slice(0, 200);
  if (fields.phone !== undefined) update.phone = fields.phone.trim().slice(0, 60);
  if (fields.value !== undefined) update.value = cleanValue(fields.value);
  if (fields.next_action !== undefined)
    update.next_action = fields.next_action.trim().slice(0, 200);
  if (fields.next_action_date !== undefined)
    update.next_action_date = cleanDate(fields.next_action_date);
  if (fields.note !== undefined) update.note = fields.note.trim().slice(0, 2000);

  // A status edit goes through the same transition-logging path as setStatus.
  let statusChange: { from: string; to: Status } | null = null;
  if (fields.status !== undefined) {
    const to = cleanStatus(fields.status);
    const { data: prior } = await supabase
      .from("clients")
      .select("status")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    const from = (prior?.status as string) ?? "";
    if (from !== to) {
      update.status = to;
      statusChange = { from, to };
    }
  }

  if (Object.keys(update).length === 0) return;

  await supabase.from("clients").update(update).eq("id", id).eq("user_id", userId);
  if (statusChange) {
    await supabase.from("client_events").insert({
      user_id: userId,
      client_id: id,
      kind: "status",
      from_status: statusChange.from,
      to_status: statusChange.to,
    });
  }
  revalidatePath(PATH);
}

export async function deleteClient(id: number) {
  const { supabase, userId } = await requireUser();
  // client_events rows cascade via the FK; delete the client itself.
  await supabase.from("clients").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export interface ClientEvent {
  id: number;
  kind: string;
  from_status: string;
  to_status: string;
  note: string;
  created_at: string;
}

// P3: load a client's activity log (most recent first) on demand.
export async function getClientEvents(clientId: number): Promise<ClientEvent[]> {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("client_events")
    .select("id, kind, from_status, to_status, note, created_at")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data || []).map((e) => ({
    id: e.id as number,
    kind: (e.kind as string) ?? "status",
    from_status: (e.from_status as string) ?? "",
    to_status: (e.to_status as string) ?? "",
    note: (e.note as string) ?? "",
    created_at: e.created_at as string,
  }));
}

// P3: surface a client's next action in the Countdown app so its due date
// shows up on the user's countdown wall. Idempotent enough for hand use —
// each call creates a fresh countdown row.
export async function linkNextActionToCountdown(id: number) {
  const { supabase, userId } = await requireUser();
  const { data: client } = await supabase
    .from("clients")
    .select("name, next_action, next_action_date")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!client) return { ok: false as const, error: "Client not found" };

  const date = cleanDate(String(client.next_action_date ?? ""));
  if (!date) return { ok: false as const, error: "No next-action date set" };

  const action = String(client.next_action ?? "").trim();
  const title = `${client.name}${action ? ` — ${action}` : ""}`.slice(0, 200);

  await supabase.from("countdowns").insert({
    user_id: userId,
    title,
    target_date: date,
    category: "Clients",
    recurring_yearly: false,
    note: "From the Clients app",
  });
  return { ok: true as const };
}
