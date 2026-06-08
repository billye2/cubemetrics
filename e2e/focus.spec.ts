import { test, expect } from "@playwright/test";

// End-to-end smoke of the Focus "Intent" flow against the live site, as a
// logged-in user: journal → set intention → run → finish early → reflect →
// save → see the new journal entry → delete it (self-cleanup).
test("intention → run → reflect → journal entry, then cleanup", async ({ page }) => {
  // Native confirm() on delete/cancel — always accept.
  page.on("dialog", (d) => d.accept());

  const marker = `E2E focus ${Date.now()}`;
  const reflection = "Verified the live flow end to end.";

  await page.goto("/app/focus");

  // storageState auth worked if we land on the journal rather than redirecting to "/".
  await expect(page.getByRole("heading", { name: "Your focus journal" })).toBeVisible();

  // Setup
  await page.getByRole("button", { name: /set an intention/i }).click();
  await expect(page.getByRole("heading", { name: /what.?s the one thing/i })).toBeVisible();
  await page.getByPlaceholder("e.g. Draft the investor update").fill(marker);
  await page.getByRole("button", { name: "Begin" }).click();

  // Run — intention is front and center; finish early instead of waiting out the timer.
  await expect(page.getByText(marker)).toBeVisible();
  await page.getByRole("button", { name: /i.?m done/i }).click();

  // Reflect
  await expect(page.getByRole("heading", { name: /did you reach it/i })).toBeVisible();
  await page.getByPlaceholder(/glad you remembered/i).fill(reflection);
  await page.getByRole("button", { name: "4 of 5" }).click();
  await page.getByRole("button", { name: /save to journal/i }).click();

  // Back on the journal — the new entry should appear (server revalidated).
  await expect(page.getByRole("heading", { name: "Your focus journal" })).toBeVisible();
  const entry = page.getByRole("listitem").filter({ hasText: marker });
  await expect(entry).toBeVisible();
  await expect(entry.getByText(`“${reflection}”`)).toBeVisible();

  // Cleanup — delete the row we just created so the journal/stats don't accrete.
  await entry.hover();
  await entry.getByRole("button", { name: "Delete session" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: marker })).toHaveCount(0);
});
