import { test as setup, expect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, ROOT } from "./env";

const STATE_PATH = resolve(ROOT, "e2e/.auth/state.json");

// Sign the E2E user in via @supabase/ssr (the SAME library the app server uses),
// capturing the cookies it emits. This guarantees the `sb-<ref>-auth-token`
// cookie is in the exact chunked/base64 format the server reads — no
// reverse-engineering — then we hand it to Playwright as a storageState.
setup("authenticate", async () => {
  const { url, anonKey, email, password, baseURL } = loadEnv();

  if (!url || !anonKey) throw new Error("Missing Supabase URL / anon key in .env.local");
  if (!password) {
    throw new Error(
      "No E2E_PASSWORD — run `node scripts/e2e/provision-user.mjs` first (test:e2e does this for you).",
    );
  }

  const jar: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => jar.map(({ name, value }) => ({ name, value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          const i = jar.findIndex((c) => c.name === name);
          if (i === -1) jar.push({ name, value, options });
          else jar[i] = { name, value, options };
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/email logins are disabled/i.test(error.message)) {
      throw new Error(
        "Supabase 'Email' auth provider is disabled. Enable it (Dashboard → Authentication → " +
          "Providers → Email) — you can keep public sign-ups OFF; only the admin-created E2E user can log in.",
      );
    }
    throw error;
  }
  expect(data.session, "expected a session after password sign-in").toBeTruthy();

  const host = new URL(baseURL).hostname;
  const cookies = jar
    .filter((c) => typeof c.value === "string" && c.value.length > 0)
    .map((c) => {
      const o = (c.options ?? {}) as Record<string, unknown>;
      const maxAge = typeof o.maxAge === "number" ? o.maxAge : 60 * 60 * 24 * 7;
      return {
        name: c.name,
        value: c.value,
        domain: host,
        path: (o.path as string) ?? "/",
        expires: Math.floor(Date.now() / 1000) + maxAge,
        httpOnly: Boolean(o.httpOnly ?? false),
        secure: true,
        sameSite: "Lax" as const,
      };
    });

  expect(cookies.some((c) => c.name.includes("auth-token")), "expected an auth-token cookie").toBe(
    true,
  );

  mkdirSync(resolve(ROOT, "e2e/.auth"), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify({ cookies, origins: [] }, null, 2));
});
