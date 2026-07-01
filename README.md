# devflow-mcp

An MCP server for automating developer workflows across **GitHub**, **Jira**, and **Slack** — built for PR/code review automation (inspect PRs, check CI status, post reviews, sync the linked ticket, notify the team).

Local stdio server: runs on your machine, launched by your MCP client. Not distributed — built for personal/team use.

## Tools

| Tool | Service | Type | Description |
|---|---|---|---|
| `github_list_open_prs` | GitHub | read | List open PRs for a repo |
| `github_get_pr` | GitHub | read | Full PR detail: description, diff stats, per-file patches |
| `github_get_pr_checks` | GitHub | read | CI/Actions check-run status for a PR's latest commit |
| `github_post_pr_review` | GitHub | write | Approve / request changes / comment on a PR |
| `github_post_pr_comment` | GitHub | write | Add a plain timeline comment to a PR |
| `jira_get_issue` | Jira | read | Fetch one issue by key |
| `jira_search_issues` | Jira | read | Search issues via JQL |
| `jira_create_issue` | Jira | write | Create a new issue in a project |
| `jira_update_issue_status` | Jira | write | Transition an issue to a new status |
| `jira_add_comment` | Jira | write | Add a comment to an issue |
| `slack_post_message` | Slack | write | Post a message to a channel |

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and fill in credentials, or set these env vars directly in your MCP client config:

- `GITHUB_TOKEN` — **fine-grained** personal access token (Settings → Developer settings → Fine-grained personal access tokens), scoped to only the repo(s) this server touches, with permissions: Pull requests (Read and write), Checks (Read-only). Avoid classic `repo`-scope tokens — they grant full access to every private repo you can see and don't force an expiration.
- `JIRA_BASE_URL` — e.g. `https://your-domain.atlassian.net`
- `JIRA_EMAIL` — the account email tied to the API token
- `JIRA_API_TOKEN` — id.atlassian.com → Security → API tokens
- `SLACK_BOT_TOKEN` — api.slack.com/apps → your app → OAuth & Permissions → Bot User OAuth Token (needs the `chat:write` scope; add `chat:write.public` too if it should post to public channels it hasn't been invited to)

A tool only fails at call time if its required env vars are missing — you don't need all three services configured to use the others.

## Connect to Claude Code

```bash
claude mcp add devflow-mcp \
  --env GITHUB_TOKEN=ghp_xxx \
  --env JIRA_BASE_URL=https://your-domain.atlassian.net \
  --env JIRA_EMAIL=you@example.com \
  --env JIRA_API_TOKEN=xxx \
  --env SLACK_BOT_TOKEN=xoxb-xxx \
  -- node /home/channen2/mcp-server/devflow-mcp/dist/server.js
```

## Connect to Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devflow-mcp": {
      "command": "node",
      "args": ["/home/channen2/mcp-server/devflow-mcp/dist/server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx",
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "you@example.com",
        "JIRA_API_TOKEN": "xxx",
        "SLACK_BOT_TOKEN": "xoxb-xxx"
      }
    }
  }
}
```

## Develop

```bash
npm run dev         # run directly with tsx, no build step
npm run inspector    # open MCP Inspector against the dev server
```

## Next steps

- **GitLab** wasn't wired up in v1 — same shape (`src/<service>.ts` + tools in `src/tools.ts`) if you need it later.
- **Distributing beyond your own machine:** this stdio server expects Node + env vars on the user's machine. If you ever need to hand this to teammates without a Node setup, repackage it as an **MCPB bundle** (bundles the Node runtime, installs with a double-click) — ask to use the `build-mcpb` skill when you're ready.
- **Wider/public distribution:** if this ever needs to serve multiple users without local installs, move to a remote HTTP deployment (e.g. Cloudflare Workers) — ask to use the `build-mcp-server` skill again for that path.
