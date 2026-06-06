// Abuse-prevention limits for the +XP assistant — shared by the server runtime
// (authoritative) and the client (first-line UX caps). NOT "server-only" so the
// client can import the same numbers. The assistant is a *quick-capture* surface:
// short messages by design, so these caps never bite legitimate use, but they stop
// a pasted wall of text or a runaway voice transcript from inflating token cost.

/** Max characters in a single user message (typed or voice-transcribed). ~250 tokens. */
export const MAX_MESSAGE_CHARS = 1000;

/** Hard stop for one voice capture (ms) — caps how much a single dictation can produce. */
export const MAX_VOICE_MS = 30_000;

/** True when a message exceeds the per-message cap. */
export function isOverLimit(text: string): boolean {
  return text.length > MAX_MESSAGE_CHARS;
}

/** Clamp a message to the cap (defensive truncation for the model payload). */
export function clampContent(text: string): string {
  return text.length > MAX_MESSAGE_CHARS ? text.slice(0, MAX_MESSAGE_CHARS) : text;
}
