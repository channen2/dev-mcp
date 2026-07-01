function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in your MCP client config (see README.md).`,
    );
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  github: {
    get token() {
      return requireEnv("GITHUB_TOKEN");
    },
    apiBase: optionalEnv("GITHUB_API_BASE") ?? "https://api.github.com",
  },
  jira: {
    get baseUrl() {
      return requireEnv("JIRA_BASE_URL");
    },
    get email() {
      return requireEnv("JIRA_EMAIL");
    },
    get apiToken() {
      return requireEnv("JIRA_API_TOKEN");
    },
  },
  slack: {
    get botToken() {
      return requireEnv("SLACK_BOT_TOKEN");
    },
  },
};
