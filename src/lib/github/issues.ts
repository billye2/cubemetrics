/**
 * Minimal GitHub issue creation via the REST API. Uses `fetch` so we don't pull
 * in an SDK. Configured by env:
 *   GITHUB_TOKEN — token with `issues:write` (push) access on the repo
 *   GITHUB_REPO  — "owner/repo" to open issues in (default: billye2/xpbbs)
 */
const DEFAULT_REPO = "billye2/xpbbs";

export interface CreatedIssue {
  number: number;
  url: string;
}

export async function createIssue(opts: {
  title: string;
  body: string;
  labels?: string[];
}): Promise<CreatedIssue> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");

  const repo = process.env.GITHUB_REPO || DEFAULT_REPO;
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`Invalid GITHUB_REPO: "${repo}" (expected owner/repo)`);

  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: opts.title, body: opts.body, labels: opts.labels }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub issue creation failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, url: data.html_url };
}
