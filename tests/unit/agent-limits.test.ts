import { describe, it, expect } from "vitest";
import {
  isOverLimit,
  clampContent,
  MAX_MESSAGE_CHARS,
  RATE_PER_HOUR,
  RATE_PER_DAY,
} from "@/lib/agent/limits";

describe("agent input limits", () => {
  it("isOverLimit flags messages past the cap", () => {
    expect(isOverLimit("hi")).toBe(false);
    expect(isOverLimit("x".repeat(MAX_MESSAGE_CHARS))).toBe(false); // exactly at cap is allowed
    expect(isOverLimit("x".repeat(MAX_MESSAGE_CHARS + 1))).toBe(true);
  });

  it("clampContent truncates to the cap, leaves short text intact", () => {
    expect(clampContent("hello")).toBe("hello");
    const wall = "x".repeat(MAX_MESSAGE_CHARS + 5000);
    expect(clampContent(wall)).toHaveLength(MAX_MESSAGE_CHARS);
  });

  it("the cap is small enough to bound per-turn token cost", () => {
    expect(MAX_MESSAGE_CHARS).toBeLessThanOrEqual(2000);
  });

  it("rate limits are sane: positive and hourly ≤ daily", () => {
    expect(RATE_PER_HOUR).toBeGreaterThan(0);
    expect(RATE_PER_DAY).toBeGreaterThan(0);
    expect(RATE_PER_HOUR).toBeLessThanOrEqual(RATE_PER_DAY);
  });
});
