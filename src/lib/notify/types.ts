// Shared contract for the proactive engine (Phase 4). Pure types — safe to import
// from server modules, the cron, and unit tests alike.

export type Kind = "morning" | "evening" | "streak_save";

/** A row of public.notification_prefs (opt-in; no row ⇒ no email). */
export interface NotifyPrefs {
  user_id: string;
  email_enabled: boolean;
  morning_enabled: boolean;
  evening_enabled: boolean;
  morning_time: string; // "HH:MM" or "HH:MM:SS"
  evening_time: string;
  streak_save_enabled: boolean;
  ai_insights_enabled: boolean; // Phase 5 (column lives in this migration)
}

/** A rendered email: HTML + plaintext alternative. */
export interface Digest {
  subject: string;
  html: string;
  text: string;
}
