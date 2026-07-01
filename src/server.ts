#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

const server = new McpServer(
  { name: "devflow-mcp", version: "0.1.0" },
  {
    instructions:
      "Tools for automating developer workflows across GitHub, Jira, and Slack. " +
      "For PR review: use github_list_open_prs / github_get_pr / github_get_pr_checks to gather context " +
      "before calling github_post_pr_review or github_post_pr_comment. " +
      "The pr_review prompt packages the full review workflow as a single one-click command.",
  },
);

registerTools(server);
registerPrompts(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("devflow-mcp fatal error:", err);
  process.exit(1);
});
