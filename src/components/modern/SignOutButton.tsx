"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function signOut() {
    start(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.replace("/");
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
