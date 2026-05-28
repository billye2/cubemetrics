"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

const ALLOWED_CATEGORIES = new Set([
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
]);

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addExpenseAction(formData: FormData) {
  const amountRaw = String(formData.get("amount") || "").trim();
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const categoryRaw = String(formData.get("category") || "Other").trim();
  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "Other";
  const description = String(formData.get("description") || "").trim();
  const dateRaw = String(formData.get("expense_date") || "").trim();
  const expense_date = dateRaw || new Date().toISOString().split("T")[0];

  const { supabase, userId } = await requireUser();
  await supabase.from("expenses").insert({
    user_id: userId,
    amount,
    category,
    description,
    expense_date,
  });
  revalidatePath("/app/expenses");
}

export async function deleteExpenseAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/expenses");
}
