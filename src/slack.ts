import { config } from "./config.js";

export async function postMessage(channel: string, text: string) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.slack.botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Slack API error: ${data.error ?? res.statusText}`);
  }
  return { channel: data.channel, ts: data.ts };
}
