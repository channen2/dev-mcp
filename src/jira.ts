import { config } from "./config.js";
import { request } from "./http.js";

function headers() {
  const basic = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString("base64");
  return {
    Authorization: `Basic ${basic}`,
    Accept: "application/json",
  };
}

function base() {
  return config.jira.baseUrl.replace(/\/$/, "");
}

function textDoc(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export async function getIssue(issueKey: string) {
  const issue = await request<any>(
    "Jira",
    `${base()}/rest/api/3/issue/${encodeURIComponent(issueKey)}`,
    { headers: headers() },
  );
  return {
    key: issue.key,
    summary: issue.fields?.summary,
    status: issue.fields?.status?.name,
    issue_type: issue.fields?.issuetype?.name,
    assignee: issue.fields?.assignee?.displayName,
    reporter: issue.fields?.reporter?.displayName,
    priority: issue.fields?.priority?.name,
    url: `${base()}/browse/${issue.key}`,
  };
}

export async function createIssue(
  projectKey: string,
  summary: string,
  issueType = "Task",
  description?: string,
) {
  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary,
    issuetype: { name: issueType },
  };
  if (description) {
    fields.description = textDoc(description);
  }
  const created = await request<any>("Jira", `${base()}/rest/api/3/issue`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  return { key: created.key, id: created.id, url: `${base()}/browse/${created.key}` };
}

export async function searchIssues(jql: string, maxResults = 25) {
  const result = await request<any>(
    "Jira",
    `${base()}/rest/api/3/search/jql`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        jql,
        maxResults,
        fields: ["summary", "status", "issuetype", "assignee", "priority"],
      }),
    },
  );
  return (result.issues ?? []).map((issue: any) => ({
    key: issue.key,
    summary: issue.fields?.summary,
    status: issue.fields?.status?.name,
    issue_type: issue.fields?.issuetype?.name,
    assignee: issue.fields?.assignee?.displayName,
  }));
}

export async function updateIssueStatus(issueKey: string, statusName: string) {
  const transitions = await request<any>(
    "Jira",
    `${base()}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    { headers: headers() },
  );
  const match = (transitions.transitions ?? []).find(
    (t: any) => t.name.toLowerCase() === statusName.toLowerCase() ||
      t.to?.name?.toLowerCase() === statusName.toLowerCase(),
  );
  if (!match) {
    const available = (transitions.transitions ?? []).map((t: any) => t.name).join(", ");
    throw new Error(
      `No transition to "${statusName}" available for ${issueKey}. Available transitions: ${available || "none"}.`,
    );
  }
  await request<void>(
    "Jira",
    `${base()}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ transition: { id: match.id } }),
    },
  );
  return { key: issueKey, transitioned_to: match.to?.name ?? match.name };
}

export async function addComment(issueKey: string, body: string) {
  const comment = await request<any>(
    "Jira",
    `${base()}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ body: textDoc(body) }),
    },
  );
  return { id: comment.id, key: issueKey };
}
