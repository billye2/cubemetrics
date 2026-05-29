"use client";

import { useEffect } from "react";
import { setTimezoneAction } from "@/lib/xp/profileActions";

/**
 * Captures the browser's IANA timezone once and persists it to the profile when
 * it differs from what's stored. Renders nothing. Mounted where logged-in users
 * land so the XP layer can bucket days in the user's local day.
 */
export function TimezoneSync({ knownTz }: { knownTz: string | null }) {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== knownTz) void setTimezoneAction(tz);
    } catch {
      /* Intl unavailable — leave the stored value as-is */
    }
  }, [knownTz]);
  return null;
}
