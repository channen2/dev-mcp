---
name: pr-review
description: Use this skill when the user asks to "review this PR", "review PR #<n>", "run the PR review workflow", "check this PR and update Jira", or otherwise wants a pull request reviewed and its status synced to Jira/Slack. Requires the devflow-mcp MCP server to be connected (tools: github_get_pr, github_get_pr_checks, github_post_pr_review, jira_get_issue, jira_update_issue_status, slack_post_message).
version: 0.1.0
---

# PR Review Workflow

Automate a full pull request review using the devflow-mcp tools. Do not skip steps or summarize without actually calling the tools — this skill performs real actions (posts a review, may update a Jira ticket, may post to Slack).

## Before starting

Identify `owner`, `repo`, and `pr_number` from the user's request or the current conversation/repo context. If any are missing or ambiguous, ask — don't guess a repo.

## Steps

1. **Gather context.** Call `github_get_pr` and `github_get_pr_checks` for the PR. Read the diff, description, and CI results.
2. **Decide a verdict.** `APPROVE` if the change looks correct and all CI checks passed, `REQUEST_CHANGES` if you spot a real problem or CI is failing, `COMMENT` otherwise (or if you're not confident enough to approve).
3. **Post the review.** Call `github_post_pr_review` with that verdict and a short, specific summary of what changed and why you reached that verdict.
   - **If GitHub rejects the review because you can't approve your own PR** (422, "Can not approve your own pull request"), retry with `event: "COMMENT"` instead, and say so plainly rather than reporting the review as approved.
4. **Sync Jira, if applicable.** If the PR title or branch name references a Jira issue key (e.g. `PROJ-123`), call `jira_get_issue` to confirm it exists, then `jira_update_issue_status` to move it to "In Review" (or "Done" if you approved). If no ticket key is present, skip this step and say so — don't guess a key.
5. **Notify Slack, if a channel is known or given.** Call `slack_post_message` with a one-line summary of the outcome and a link to the PR. If no channel was specified and none is obvious from context, ask before posting rather than picking one.

## Reporting back

After running the steps, tell the user what you found and what you actually did at each step (verdict + reasoning, whether Jira was updated, whether Slack was notified) — not just "done."
