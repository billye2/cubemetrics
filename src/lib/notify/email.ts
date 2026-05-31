import "server-only";
import { Resend } from "resend";
import type { Digest } from "./types";

/** Send a digest via Resend. Safe without secrets: if RESEND_API_KEY / NOTIFY_FROM
 *  aren't configured, it no-ops and returns false (the cron logs it as not sent). */
export async function sendEmail(to: string, mail: Digest): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from || !to) return false;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return !error;
  } catch {
    return false;
  }
}
