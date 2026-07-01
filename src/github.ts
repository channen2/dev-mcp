import { config } from "./config.js";
import { request } from "./http.js";

function headers() {
  return {
    Authorization: `Bearer ${config.github.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function base() {
  return config.github.apiBase;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: string;
  head: string;
  base: string;
  url: string;
  created_at: string;
  updated_at: string;
}

function toSummary(pr: any): PullRequestSummary {
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    user: pr.user?.login,
    head: pr.head?.ref,
    base: pr.base?.ref,
    url: pr.html_url,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
  };
}

export async function listOpenPullRequests(
  owner: string,
  repo: string,
): Promise<PullRequestSummary[]> {
  const prs = await request<any[]>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/pulls?state=open&per_page=50`,
    { headers: headers() },
  );
  return prs.map(toSummary);
}

export async function getPullRequest(owner: string, repo: string, prNumber: number) {
  const pr = await request<any>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: headers() },
  );
  const files = await request<any[]>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers: headers() },
  );
  return {
    ...toSummary(pr),
    body: pr.body,
    mergeable: pr.mergeable,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    head_sha: pr.head?.sha,
    files: files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: typeof f.patch === "string" ? f.patch.slice(0, 2000) : undefined,
    })),
  };
}

export async function getPullRequestChecks(owner: string, repo: string, prNumber: number) {
  const pr = await request<any>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: headers() },
  );
  const sha = pr.head?.sha;
  const checks = await request<any>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`,
    { headers: headers() },
  );
  return {
    pr_number: prNumber,
    head_sha: sha,
    total_count: checks.total_count,
    check_runs: (checks.check_runs ?? []).map((c: any) => ({
      name: c.name,
      status: c.status,
      conclusion: c.conclusion,
      started_at: c.started_at,
      completed_at: c.completed_at,
      details_url: c.details_url,
    })),
  };
}

export async function postPullRequestReview(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
) {
  const review = await request<any>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ body, event }),
    },
  );
  return { id: review.id, state: review.state, html_url: review.html_url };
}

export async function postPullRequestComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
) {
  const comment = await request<any>(
    "GitHub",
    `${base()}/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  return { id: comment.id, html_url: comment.html_url };
}
