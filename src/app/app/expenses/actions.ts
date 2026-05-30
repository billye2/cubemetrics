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

// Validate a category against the user's own list (replaces the old hard-coded
// allowlist). Falls back to "Other" when the name isn't one of theirs.
async function resolveCategory(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  raw: string,
): Promise<string> {
  const name = raw.trim();
  if (!name) return "Other";
  const { data } = await supabase
    .from("expense_categories")
    .select("name")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();
  return data?.name ?? "Other";
}

export async function addExpenseAction(formData: FormData) {
  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const description = String(formData.get("description") || "").trim();
  const dateRaw = String(formData.get("expense_date") || "").trim();
  const expense_date = dateRaw || new Date().toISOString().split("T")[0];

  const { supabase, userId } = await requireUser();
  const category = await resolveCategory(
    supabase,
    userId,
    String(formData.get("category") || "Other"),
  );

  await supabase.from("expenses").insert({
    user_id: userId,
    amount,
    category,
    description,
    expense_date,
  });
  revalidatePath("/app/expenses");
}

export async function updateExpenseAction(formData: FormData) {
  const id = Number(String(formData.get("id") || ""));
  if (!Number.isFinite(id)) return;

  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const description = String(formData.get("description") || "").trim();
  const dateRaw = String(formData.get("expense_date") || "").trim();
  const expense_date = dateRaw || new Date().toISOString().split("T")[0];

  const { supabase, userId } = await requireUser();
  const category = await resolveCategory(
    supabase,
    userId,
    String(formData.get("category") || "Other"),
  );

  await supabase
    .from("expenses")
    .update({ amount, category, description, expense_date })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/expenses");
}

export async function deleteExpenseAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/expenses");
}

// --- Custom categories -----------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function addCategoryAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim().slice(0, 40);
  if (!name) return;
  const colorRaw = String(formData.get("color") || "").trim();
  const color = HEX.test(colorRaw) ? colorRaw : "#06b6d4";

  const { supabase, userId } = await requireUser();
  // Place new category at the end.
  const { data: last } = await supabase
    .from("expense_categories")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (last?.sort_order ?? -1) + 1;

  await supabase
    .from("expense_categories")
    .upsert(
      { user_id: userId, name, color, sort_order },
      { onConflict: "user_id,name" },
    );
  revalidatePath("/app/expenses");
}

export async function deleteCategoryAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/expenses");
}
