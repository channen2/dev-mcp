import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    "pr_review",
    {
      title: "Review a pull request",
      description:
        "Run the full PR review workflow: inspect the PR and its CI checks, decide a review verdict, post the review, update the linked Jira ticket, and notify Slack.",
      argsSchema: {
        owner: z.string().describe("Repository owner or org"),
        repo: z.string().describe("Repository name"),
        pr_number: z.string().describe("Pull request number"),
        jira_ticket: z
          .string()
          .optional()
          .describe("Jira issue key to update, e.g. 'PROJ-123'. Leave blank to auto-detect from the PR title/branch, or skip."),
        slack_channel: z
          .string()
          .optional()
          .describe("Slack channel to notify, e.g. '#dev'. Leave blank to skip the Slack step."),
      },
    },
    ({ owner, repo, pr_number, jira_ticket, slack_channel }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Review pull request #${pr_number} in ${owner}/${repo} using the devflow-mcp tools:`,
              ``,
              `1. Call github_get_pr and github_get_pr_checks for this PR to see the diff, description, and CI status.`,
              `2. Read the diff and CI results. Decide a review verdict: APPROVE if the change looks correct and CI is green, REQUEST_CHANGES if you spot a real problem or CI is failing, COMMENT otherwise.`,
              `3. Call github_post_pr_review with that verdict and a short written summary explaining your reasoning.`,
              jira_ticket
                ? `4. Call jira_get_issue for ${jira_ticket}, then jira_update_issue_status to move it to "In Review" (or "Done" if you approved).`
                : `4. If the PR title or branch name references a Jira issue key (e.g. PROJ-123), call jira_get_issue and jira_update_issue_status to reflect the review outcome. Otherwise skip this step and say so.`,
              slack_channel
                ? `5. Call slack_post_message on ${slack_channel} with a one-line summary of the review outcome and a link to the PR.`
                : `5. If it'd be useful to notify the team, ask which Slack channel to post to, then call slack_post_message. Otherwise skip.`,
              ``,
              `Report back what you found and what actions you took at each step.`,
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
