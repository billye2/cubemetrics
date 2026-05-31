import "server-only";
import crypto from "node:crypto";

// HMAC-signed unsubscribe tokens. The link only ever flips email_enabled=false,
// so a leak is low-impact — but it must be unguessable and tamper-evident.
const secret = () => process.env.NOTIFY_SIGNING_SECRET ?? "dev-unsafe-secret";

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(payloadPart: string): Buffer {
  return crypto.createHmac("sha256", secret()).update(payloadPart).digest();
}

export function sign(payload: { userId: string; kind: string }): string {
  const payloadPart = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(hmac(payloadPart));
  return `${payloadPart}.${sig}`;
}

export function verify(token: string): { userId: string; kind: string } | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payloadPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);

  let provided: Buffer;
  try {
    provided = Buffer.from(sigPart, "base64url");
  } catch {
    return null;
  }
  const expected = hmac(payloadPart);
  // Constant-time compare; length guard first (timingSafeEqual throws on mismatch).
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    if (
      decoded &&
      typeof decoded === "object" &&
      typeof decoded.userId === "string" &&
      typeof decoded.kind === "string"
    ) {
      return { userId: decoded.userId, kind: decoded.kind };
    }
    return null;
  } catch {
    return null;
  }
}

export function unsubscribeUrl(userId: string, kind: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/api/notifications/unsubscribe?t=${encodeURIComponent(sign({ userId, kind }))}`;
}
