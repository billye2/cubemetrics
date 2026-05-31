"use client";
import { useEffect } from "react";
import { recordUsage } from "@/lib/spine/usage";

/** Mount-time beacon: records app usage once per page load via a server action,
 *  without a render-time DB write. Renders nothing. */
export function TrackUsage({ appId }: { appId: string }) {
  useEffect(() => {
    void recordUsage(appId);
  }, [appId]);
  return null;
}
