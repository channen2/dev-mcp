#!/usr/bin/env node
// Introspects the live devflow-mcp server (source of truth for tools/prompts)
// and combines it with .claude/skills/*/SKILL.md metadata into ui/catalog.json.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadTasksFromServer() {
  const transport = new StdioClientTransport({
    command: path.join(root, "node_modules", ".bin", "tsx"),
    args: [path.join(root, "src", "server.ts")],
    cwd: root,
    stderr: "ignore",
  });
  const client = new Client({ name: "devflow-mcp-catalog-builder", version: "0.1.0" });
  await client.connect(transport);
  try {
    const [{ tools }, { prompts }] = await Promise.all([
      client.listTools(),
      client.listPrompts(),
    ]);
    return { tools, prompts };
  } finally {
    await client.close();
  }
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {} as Record<string, string>, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: match[2].trim() };
}

async function loadSkills() {
  const skillsDir = path.join(root, ".claude", "skills");
  if (!existsSync(skillsDir)) return [];
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const raw = await readFile(skillFile, "utf8");
    const { meta, body } = parseFrontmatter(raw);
    skills.push({
      name: meta.name ?? entry.name,
      description: meta.description ?? "",
      version: meta.version ?? "",
      body,
    });
  }
  return skills;
}

async function main() {
  const [{ tools, prompts }, skills] = await Promise.all([
    loadTasksFromServer(),
    loadSkills(),
  ]);

  const catalog = {
    generatedAt: new Date().toISOString(),
    server: { name: "devflow-mcp", version: "0.1.0" },
    tools,
    prompts,
    skills,
  };

  const outPath = path.join(root, "ui", "catalog.json");
  await writeFile(outPath, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `Wrote ${outPath} (${tools.length} tools, ${prompts.length} prompts, ${skills.length} skills)`,
  );
}

main().catch((err) => {
  console.error("build-catalog failed:", err);
  process.exit(1);
});
