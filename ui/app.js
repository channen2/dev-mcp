const SERVICE_META = {
  github: { label: "GitHub", color: "var(--github)" },
  jira: { label: "Jira", color: "var(--jira)" },
  slack: { label: "Slack", color: "var(--slack)" },
};

const state = { catalog: null, tab: "tools", query: "" };

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function serviceOf(name) {
  const prefix = name.split("_")[0];
  return SERVICE_META[prefix] ? prefix : "other";
}

function matches(haystack, query) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

// Minimal markdown -> HTML for SKILL.md bodies: headers, bold, inline code, lists, paragraphs.
function renderMarkdown(md) {
  const lines = md.split("\n");
  let html = "";
  let inList = null; // 'ul' | 'ol' | null
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html += `<p>${inline(paragraph.join(" "))}</p>`;
      paragraph = [];
    }
  };
  const closeList = () => {
    if (inList) { html += `</${inList}>`; inList = null; }
  };
  const inline = (text) =>
    escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);

    if (heading) {
      flushParagraph(); closeList();
      html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    } else if (ordered) {
      flushParagraph();
      if (inList !== "ol") { closeList(); html += "<ol>"; inList = "ol"; }
      html += `<li>${inline(ordered[1])}</li>`;
    } else if (bullet) {
      flushParagraph();
      if (inList !== "ul") { closeList(); html += "<ul>"; inList = "ul"; }
      html += `<li>${inline(bullet[1])}</li>`;
    } else if (line.trim() === "") {
      flushParagraph(); closeList();
    } else {
      paragraph.push(line.trim());
    }
  }
  flushParagraph(); closeList();
  return html;
}

function annotationBadges(annotations) {
  if (!annotations) return "";
  const badges = [];
  if (annotations.readOnlyHint) {
    badges.push('<span class="badge read">read-only</span>');
  } else {
    badges.push('<span class="badge write">write</span>');
    if (annotations.destructiveHint) badges.push('<span class="badge destructive">destructive</span>');
  }
  return badges.join("");
}

function paramsTable(schema) {
  const props = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);
  const keys = Object.keys(props);
  if (!keys.length) return '<div class="no-params">No parameters</div>';
  const rows = keys.map((key) => {
    const p = props[key];
    const type = p.type ?? (p.anyOf ? p.anyOf.map((s) => s.type).join(" | ") : "any");
    return `<tr>
      <td class="param-name">${escapeHtml(key)}${required.has(key) ? '<span class="param-req">required</span>' : ""}</td>
      <td class="param-type">${escapeHtml(type)}</td>
      <td>${escapeHtml(p.description ?? "")}</td>
    </tr>`;
  }).join("");
  return `<table class="params-table">
    <thead><tr><th>Param</th><th>Type</th><th>Description</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function toolCard(tool) {
  return `<div class="card" data-kind="tool">
    <div class="card-head" onclick="this.parentElement.classList.toggle('open')">
      <span class="chevron">&#9656;</span>
      <span class="card-name mono">${escapeHtml(tool.name)}</span>
      <span class="card-title">${escapeHtml(tool.title ?? "")}</span>
      <span class="badges">${annotationBadges(tool.annotations)}</span>
    </div>
    <div class="card-body">
      <p class="description">${escapeHtml(tool.description ?? "")}</p>
      ${paramsTable(tool.inputSchema)}
    </div>
  </div>`;
}

function promptCard(prompt) {
  const args = prompt.arguments ?? [];
  const rows = args.length
    ? `<table class="params-table">
        <thead><tr><th>Arg</th><th>Description</th></tr></thead>
        <tbody>${args.map((a) => `<tr>
          <td class="param-name">${escapeHtml(a.name)}${a.required ? '<span class="param-req">required</span>' : ""}</td>
          <td>${escapeHtml(a.description ?? "")}</td>
        </tr>`).join("")}</tbody>
      </table>`
    : '<div class="no-params">No arguments</div>';
  return `<div class="card" data-kind="prompt">
    <div class="card-head" onclick="this.parentElement.classList.toggle('open')">
      <span class="chevron">&#9656;</span>
      <span class="card-name mono">${escapeHtml(prompt.name)}</span>
      <span class="card-title">${escapeHtml(prompt.title ?? "")}</span>
    </div>
    <div class="card-body">
      <p class="description">${escapeHtml(prompt.description ?? "")}</p>
      ${rows}
    </div>
  </div>`;
}

function skillCard(skill) {
  return `<div class="card" data-kind="skill">
    <div class="card-head" onclick="this.parentElement.classList.toggle('open')">
      <span class="chevron">&#9656;</span>
      <span class="card-name mono">${escapeHtml(skill.name)}</span>
      <span class="card-title">${skill.version ? `v${escapeHtml(skill.version)}` : ""}</span>
    </div>
    <div class="card-body">
      <p class="description">${escapeHtml(skill.description ?? "")}</p>
      <div class="skill-body">${renderMarkdown(skill.body ?? "")}</div>
    </div>
  </div>`;
}

function renderTools(catalog, query) {
  const grouped = {};
  for (const tool of catalog.tools) {
    if (!matches(`${tool.name} ${tool.title ?? ""} ${tool.description ?? ""}`, query)) continue;
    const svc = serviceOf(tool.name);
    (grouped[svc] ??= []).push(tool);
  }
  const order = ["github", "jira", "slack", "other"];
  const sections = order
    .filter((svc) => grouped[svc]?.length)
    .map((svc) => {
      const meta = SERVICE_META[svc] ?? { label: "Other", color: "var(--text-dim)" };
      return `<div class="group">
        <div class="group-title"><span class="swatch" style="background:${meta.color}"></span>${meta.label} <span style="opacity:.6">(${grouped[svc].length})</span></div>
        <div class="cards">${grouped[svc].map(toolCard).join("")}</div>
      </div>`;
    });
  return sections.length ? sections.join("") : '<div class="empty">No tools match your search.</div>';
}

function renderPrompts(catalog, query) {
  const prompts = catalog.prompts.filter((p) =>
    matches(`${p.name} ${p.title ?? ""} ${p.description ?? ""}`, query));
  if (!prompts.length) return '<div class="empty">No prompts match your search.</div>';
  return `<div class="cards">${prompts.map(promptCard).join("")}</div>`;
}

function renderSkills(catalog, query) {
  const skills = catalog.skills.filter((s) =>
    matches(`${s.name} ${s.description ?? ""}`, query));
  if (!skills.length) return '<div class="empty">No skills match your search.</div>';
  return `<div class="cards">${skills.map(skillCard).join("")}</div>`;
}

function render() {
  const { catalog, tab, query } = state;
  const main = document.getElementById("main");
  if (tab === "tools") main.innerHTML = renderTools(catalog, query);
  else if (tab === "prompts") main.innerHTML = renderPrompts(catalog, query);
  else main.innerHTML = renderSkills(catalog, query);

  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tab);
  });
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((el) => {
    el.addEventListener("click", () => {
      state.tab = el.dataset.tab;
      render();
    });
  });
}

async function main() {
  const res = await fetch("catalog.json");
  const catalog = await res.json();
  state.catalog = catalog;

  document.getElementById("tool-count").textContent = catalog.tools.length;
  document.getElementById("prompt-count").textContent = catalog.prompts.length;
  document.getElementById("skill-count").textContent = catalog.skills.length;
  document.getElementById("generated-at").textContent =
    `generated ${new Date(catalog.generatedAt).toLocaleString()}`;

  document.getElementById("search").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });

  setupTabs();
  render();
}

main().catch((err) => {
  document.getElementById("main").innerHTML =
    `<div class="empty">Failed to load catalog.json — run <code>npm run ui:build</code> first.<br><br>${escapeHtml(err.message)}</div>`;
});
