import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as github from "./github.js";
import * as jira from "./jira.js";
import * as slack from "./slack.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

async function safe<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (e: any) {
    return err(e?.message ?? String(e));
  }
}

export function registerTools(server: McpServer) {
  // ---- GitHub: read ----

  server.registerTool(
    "github_list_open_prs",
    {
      title: "List open pull requests",
      description:
        "List open pull requests for a GitHub repository. Returns number, title, author, branches, and URL for each. Use github_get_pr for full detail on one PR.",
      inputSchema: {
        owner: z.string().describe("Repository owner or org, e.g. 'anthropics'"),
        repo: z.string().describe("Repository name, e.g. 'claude-code'"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ owner, repo }) => safe(() => github.listOpenPullRequests(owner, repo)),
  );

  server.registerTool(
    "github_get_pr",
    {
      title: "Get pull request detail",
      description:
        "Fetch full detail for a single pull request: description, diff stats, and per-file patches (truncated to 2000 chars each). Use github_list_open_prs first if you don't know the PR number.",
      inputSchema: {
        owner: z.string().describe("Repository owner or org"),
        repo: z.string().describe("Repository name"),
        pr_number: z.number().int().positive().describe("Pull request number"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ owner, repo, pr_number }) =>
      safe(() => github.getPullRequest(owner, repo, pr_number)),
  );

  server.registerTool(
    "github_get_pr_checks",
    {
      title: "Get pull request CI checks",
      description:
        "Get GitHub Actions / Checks API status for a pull request's latest commit (build, test, lint results). Returns each check run's name, status, and conclusion.",
      inputSchema: {
        owner: z.string().describe("Repository owner or org"),
        repo: z.string().describe("Repository name"),
        pr_number: z.number().int().positive().describe("Pull request number"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ owner, repo, pr_number }) =>
      safe(() => github.getPullRequestChecks(owner, repo, pr_number)),
  );

  // ---- GitHub: write ----

  server.registerTool(
    "github_post_pr_review",
    {
      title: "Submit a pull request review",
      description:
        "Submit a formal review on a pull request: approve, request changes, or leave a review comment. This is a distinct action from github_post_pr_comment (a plain comment, no approval state).",
      inputSchema: {
        owner: z.string().describe("Repository owner or org"),
        repo: z.string().describe("Repository name"),
        pr_number: z.number().int().positive().describe("Pull request number"),
        body: z.string().describe("Review summary text"),
        event: z
          .enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"])
          .describe("Review verdict: APPROVE, REQUEST_CHANGES, or COMMENT"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ owner, repo, pr_number, body, event }) =>
      safe(() => github.postPullRequestReview(owner, repo, pr_number, body, event)),
  );

  server.registerTool(
    "github_post_pr_comment",
    {
      title: "Post a pull request comment",
      description:
        "Add a plain timeline comment to a pull request (not tied to a review verdict). Use github_post_pr_review to approve or request changes.",
      inputSchema: {
        owner: z.string().describe("Repository owner or org"),
        repo: z.string().describe("Repository name"),
        pr_number: z.number().int().positive().describe("Pull request number"),
        body: z.string().describe("Comment text (Markdown supported)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ owner, repo, pr_number, body }) =>
      safe(() => github.postPullRequestComment(owner, repo, pr_number, body)),
  );

  // ---- Jira: read ----

  server.registerTool(
    "jira_get_issue",
    {
      title: "Get Jira issue",
      description:
        "Fetch a single Jira issue by key (e.g. 'PROJ-123'): summary, status, type, assignee, reporter, priority.",
      inputSchema: {
        issue_key: z.string().describe("Jira issue key, e.g. 'PROJ-123'"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ issue_key }) => safe(() => jira.getIssue(issue_key)),
  );

  server.registerTool(
    "jira_search_issues",
    {
      title: "Search Jira issues",
      description:
        "Search Jira issues using JQL (Jira Query Language). Returns up to `max_results` matches with key, summary, status, type, assignee. The query must include a search restriction (e.g. a project, status, or assignee clause) — a bare 'order by ...' with no filter is rejected by Jira. Use jira_get_issue for full detail on one issue.",
      inputSchema: {
        jql: z
          .string()
          .describe("JQL query string with at least one filter clause, e.g. 'project = PROJ AND status = \"In Progress\"'"),
        max_results: z.number().int().min(1).max(100).default(25)
          .describe("Max results to return, capped at 100"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ jql, max_results }) => safe(() => jira.searchIssues(jql, max_results)),
  );

  // ---- Jira: write ----

  server.registerTool(
    "jira_create_issue",
    {
      title: "Create a Jira issue",
      description:
        "Create a new Jira issue in the given project. Returns the new issue's key and URL. Use jira_search_issues first if you're unsure of the project key or which issue types it supports.",
      inputSchema: {
        project_key: z.string().describe("Jira project key, e.g. 'PROJ'"),
        summary: z.string().describe("Issue title/summary"),
        issue_type: z.string().default("Task")
          .describe("Issue type name as configured on the project, e.g. 'Task', 'Bug', 'Story'"),
        description: z.string().optional().describe("Optional plain-text issue description"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ project_key, summary, issue_type, description }) =>
      safe(() => jira.createIssue(project_key, summary, issue_type, description)),
  );

  server.registerTool(
    "jira_update_issue_status",
    {
      title: "Transition Jira issue status",
      description:
        "Move a Jira issue to a new status by name (e.g. 'In Progress', 'Done'), following the issue's configured workflow transitions. Fails with the list of valid transitions if the target status isn't directly reachable.",
      inputSchema: {
        issue_key: z.string().describe("Jira issue key, e.g. 'PROJ-123'"),
        status: z.string().describe("Target status or transition name, e.g. 'Done'"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ issue_key, status }) => safe(() => jira.updateIssueStatus(issue_key, status)),
  );

  server.registerTool(
    "jira_add_comment",
    {
      title: "Add a Jira issue comment",
      description: "Add a plain-text comment to a Jira issue.",
      inputSchema: {
        issue_key: z.string().describe("Jira issue key, e.g. 'PROJ-123'"),
        body: z.string().describe("Comment text"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ issue_key, body }) => safe(() => jira.addComment(issue_key, body)),
  );

  // ---- Slack: write ----

  server.registerTool(
    "slack_post_message",
    {
      title: "Post a Slack message",
      description:
        "Post a text message to a Slack channel via the bot's Slack app. The bot must be a member of the channel (or the app must have the chat:write.public scope for public channels).",
      inputSchema: {
        channel: z.string().describe("Slack channel ID (e.g. 'C0123456789') or name (e.g. '#dev-alerts')"),
        text: z.string().describe("Message text, Slack mrkdwn supported"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ channel, text }) => safe(() => slack.postMessage(channel, text)),
  );
}
