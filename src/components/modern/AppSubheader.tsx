"use client";

import { usePathname } from "next/navigation";
import { getApp } from "@/lib/modern/catalog";

/**
 * One-line app description shown at the top of each individual app page, so the
 * "what it does" copy from the catalog (also on the grid tiles) is visible
 * inside the app too. Self-contained like <HeaderStar>/<HeaderFeedback>: derives
 * the app id from the route and renders nothing off /app/<id> or for an id with
 * no catalog entry. Mounted once in <Shell>, so it works across every app with
 * no per-page edits.
 */
export function AppSubheader() {
  const pathname = usePathname() ?? "";
  const appId = pathname.startsWith("/app/") ? pathname.split("/")[2] || "" : "";
  const app = appId ? getApp(appId) : undefined;
  if (!app?.description) return null;

  return <p className="-mt-1 mb-4 text-sm text-zinc-500">{app.description}</p>;
}
