import "server-only";
import { getApp } from "@/lib/modern/catalog";
import { streakAtRisk } from "./policy";
import type { Kind, Digest } from "./types";
import type { SpineToday } from "@/lib/spine/types";
import type { XpSummary } from "@/lib/xp/compute";

const BG = "#09090b";
const CARD = "#18181b";
const TEXT = "#e4e4e7";
const MUTED = "#a1a1aa";
const ACCENT = "#06b6d4";

/** HTML-escape every interpolated user/model-derived string. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Named {
  card: SpineToday;
  name: string;
  icon: string;
}

function named(card: SpineToday): Named {
  const app = getApp(card.appId);
  return { card, name: app?.name ?? card.appId, icon: app?.icon ?? "•" };
}

function htmlCard(n: Named): string {
  const { card } = n;
  const items = card.items
    .map(
      (it) =>
        `<div style="color:${MUTED};font-size:13px;margin:2px 0 0 0;">• ${esc(it.label)}</div>`,
    )
    .join("");
  const more =
    card.count > card.items.length
      ? `<div style="color:${ACCENT};font-size:12px;margin-top:4px;">+${card.count - card.items.length} more</div>`
      : "";
  return `<div style="background:${CARD};border-radius:10px;padding:14px 16px;margin:8px 0;">
    <div style="font-size:15px;font-weight:600;color:${TEXT};">${esc(n.icon)} ${esc(n.name)}</div>
    <div style="color:${MUTED};font-size:13px;margin-top:2px;">${esc(card.summary)}</div>
    ${items}${more}
  </div>`;
}

function textCard(n: Named): string {
  const lines = [`${n.icon} ${n.name} — ${n.card.summary}`];
  for (const it of n.card.items) lines.push(`  • ${it.label}`);
  if (n.card.count > n.card.items.length)
    lines.push(`  +${n.card.count - n.card.items.length} more`);
  return lines.join("\n");
}

function button(url: string): string {
  return `<div style="margin:20px 0 8px 0;">
    <a href="${url}" style="display:inline-block;background:${ACCENT};color:#09090b;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px;">Open Today →</a>
  </div>`;
}

function section(title: string, cards: Named[]): { html: string; text: string } {
  if (cards.length === 0) return { html: "", text: "" };
  const html = `<div style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:18px 0 4px 0;">${esc(title)}</div>${cards.map(htmlCard).join("")}`;
  const text = `${title.toUpperCase()}\n${cards.map(textCard).join("\n")}`;
  return { html, text };
}

export function buildDigest(
  kind: Kind,
  today: SpineToday[],
  xp: XpSummary | null,
  unsubUrl: string,
  tz: string,
): Digest {
  void tz; // labels here are tz-agnostic; param kept for contract parity
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const todayUrl = `${site}/today`;
  const prefsUrl = `${site}/app/notifications`;

  const cards = today.map(named);
  const actionable = cards.filter(
    (n) => n.card.severity === "overdue" || n.card.severity === "due",
  );
  const done = cards.filter((n) => n.card.severity === "done");
  const upcoming = cards.filter(
    (n) => n.card.severity !== "overdue" && n.card.severity !== "due" && n.card.severity !== "done",
  );
  const atRisk = streakAtRisk(xp);
  const streak = xp?.streak ?? 0;

  // ── Subject ────────────────────────────────────────────────────────────────
  let subject: string;
  if (kind === "morning") {
    subject = actionable.length
      ? `Your day · ${actionable.length} need attention`
      : atRisk
        ? `Keep your ${xp!.streak}-day streak 🔥`
        : "Your day";
  } else if (kind === "evening") {
    subject = atRisk ? `🔥 Keep your ${xp!.streak}-day streak` : "Close out your day";
  } else {
    subject = `🔥 Don't break your ${streak}-day streak`;
  }

  // ── Body sections ────────────────────────────────────────────────────────────
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  const push = (s: { html: string; text: string }) => {
    if (s.html) htmlParts.push(s.html);
    if (s.text) textParts.push(s.text);
  };

  if (kind === "evening") {
    push(section("Done today", done));
    push(section("Still open", actionable));
    if (atRisk) {
      const line = `Log one thing to keep your ${streak}-day streak`;
      htmlParts.push(
        `<div style="background:${CARD};border:1px solid ${ACCENT};border-radius:10px;padding:14px 16px;margin:12px 0;color:${TEXT};font-size:15px;font-weight:600;">🔥 ${esc(line)}</div>`,
      );
      textParts.push(`🔥 ${line}`);
    }
  } else {
    push(section("Needs attention", actionable));
    push(section("Upcoming", upcoming));
    if (atRisk) {
      const line = `You're on a ${streak}-day streak — keep it going.`;
      htmlParts.push(
        `<div style="color:${ACCENT};font-size:14px;font-weight:600;margin:12px 0;">🔥 ${esc(line)}</div>`,
      );
      textParts.push(`🔥 ${line}`);
    }
  }

  // ── Assemble ────────────────────────────────────────────────────────────────
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${BG};">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;background:${BG};color:${TEXT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="font-size:20px;font-weight:700;color:${ACCENT};">XP Boost</div>
    <div style="font-size:17px;font-weight:600;margin-top:4px;">${esc(subject)}</div>
    ${htmlParts.join("\n")}
    ${button(todayUrl)}
    <div style="border-top:1px solid ${CARD};margin-top:24px;padding-top:14px;color:${MUTED};font-size:12px;">
      <a href="${unsubUrl}" style="color:${MUTED};">Unsubscribe</a> ·
      <a href="${prefsUrl}" style="color:${MUTED};">manage preferences</a>
    </div>
  </div>
  </body></html>`;

  const text = [
    "XP Boost",
    subject,
    "",
    ...textParts,
    "",
    `Open Today: ${todayUrl}`,
    "",
    `Unsubscribe: ${unsubUrl}`,
    `Manage preferences: ${prefsUrl}`,
  ].join("\n");

  return { subject, html, text };
}
