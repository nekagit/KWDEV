#!/usr/bin/env node
/**
 * Converts each data/prompts/*.prompt.md into a sibling .prompt.json
 * with source_markdown (full copy), structured (parsed sections), and prompt (template + metadata).
 * No information loss: source_markdown is the exact file content.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const PROMPTS_DIR = path.join(REPO_ROOT, "data/prompts");

function extractSections(raw) {
  const structured = {
    title: "",
    role_or_intent: "",
    context_and_conventions: "",
    checklist: [],
    dos: [],
    donts: [],
    output_format: null,
    user_placeholder_note: "",
    references: { file_refs: [], tables: "" },
  };

  const lines = raw.split(/\r?\n/);
  let i = 0;

  // Title: first non-empty line (strip #)
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length) {
    structured.title = lines[i].replace(/^#\s*/, "").trim();
    i++;
  }

  // Role/intent: until first ##
  const roleLines = [];
  while (i < lines.length && !/^##\s/.test(lines[i])) {
    if (lines[i].trim()) roleLines.push(lines[i]);
    i++;
  }
  structured.role_or_intent = roleLines.join("\n").trim();

  // Parse ## sections
  let currentSection = null;
  let currentContent = [];
  let inFencedBlock = false;
  let fencedDelim = null;
  let fencedContent = [];
  const sections = new Map();

  while (i < lines.length) {
    const line = lines[i];
    const sectionMatch = line.match(/^##\s+(.+)$/);
    const phaseMatch = line.match(/^###\s+(.+)$/);

    if (inFencedBlock) {
      if (line.trim() === fencedDelim) {
        inFencedBlock = false;
        if (currentSection && (currentSection.includes("Required") || currentSection.includes("Output Format"))) {
          if (!structured.output_format) structured.output_format = { description: "", target_file: "", required_structure_markdown: "" };
          structured.output_format.required_structure_markdown = fencedContent.join("\n");
        }
        fencedContent = [];
      } else {
        fencedContent.push(line);
      }
      i++;
      continue;
    }

    const openFence = line.match(/^```(\w*)/);
    if (openFence && currentSection) {
      inFencedBlock = true;
      fencedDelim = "```" + (openFence[1] ? openFence[1] : "");
      i++;
      continue;
    }

    if (sectionMatch) {
      if (currentSection) {
        const key = currentSection.trim();
        sections.set(key, currentContent.join("\n").trim());
        currentContent = [];
      }
      currentSection = sectionMatch[1].trim();
      i++;
      continue;
    }

    if (currentSection) currentContent.push(line);
    i++;
  }
  if (currentSection) sections.set(currentSection.trim(), currentContent.join("\n").trim());

  // Context
  for (const [name, content] of sections) {
    if (name.includes("Context")) {
      structured.context_and_conventions = content;
      break;
    }
  }

  // Checklist (🎯)
  for (const [name, content] of sections) {
    if (name.includes("🎯") || name.toLowerCase().includes("checklist")) {
      const phaseBlocks = content.split(/(?=^###\s)/m).filter(Boolean);
      if (phaseBlocks.length <= 1 && !content.trim().startsWith("###")) {
        const items = [];
        for (const ln of content.split("\n")) {
          const m = ln.match(/^\s*-\s+\[\s*\]\s*\*\*(.+)\*\*|^\s*-\s+\[\s*\]\s*(.+)/);
          if (m) items.push((m[1] || m[2]).trim());
        }
        if (items.length) structured.checklist.push({ phase: undefined, items });
      } else {
        let phase = "";
        const items = [];
        for (const ln of content.split("\n")) {
          const pm = ln.match(/^###\s+(.+)$/);
          if (pm) {
            if (phase || items.length) structured.checklist.push({ phase: phase || undefined, items: [...items] });
            items.length = 0;
            phase = pm[1].trim();
          } else {
            const m = ln.match(/^\s*-\s+\[\s*\]\s*\*\*(.+)\*\*|^\s*-\s+\[\s*\]\s*(.+)/);
            if (m) items.push((m[1] || m[2]).trim());
          }
        }
        if (phase || items.length) structured.checklist.push({ phase: phase || undefined, items: [...items] });
      }
      break;
    }
  }

  // Dos
  for (const [name, content] of sections) {
    if (name.includes("✅") || (name.toLowerCase().includes("dos") && !name.toLowerCase().includes("don"))) {
      const items = [];
      for (const ln of content.split("\n")) {
        const m = ln.match(/^\s*-\s+\*\*Do\*\*\s*(.+)/);
        if (m) items.push(m[1].trim());
      }
      structured.dos = items;
      break;
    }
  }

  // Don'ts
  for (const [name, content] of sections) {
    if (name.includes("❌") || name.toLowerCase().includes("don'ts") || name.toLowerCase().includes("don't")) {
      const items = [];
      for (const ln of content.split("\n")) {
        if (/^\s*-\s+\*\*Don'?t'?s?\*\*/.test(ln)) {
          const t = ln.replace(/^\s*-\s+\*\*Don'?t'?s?\*\*\s*/, "").trim();
          if (t) items.push(t);
        }
      }
      structured.donts = items;
      break;
    }
  }

  // Output format target_file from raw: .cursor/worker/*.md or `*.md` in "write to" / "output to" context
  if (!structured.output_format) structured.output_format = { description: "", target_file: "", required_structure_markdown: "" };
  const cursorMd = raw.match(/\.cursor\/worker\/[a-z0-9-]+\.md/);
  const backtickMd = raw.match(/write\s+(?:your?\s+)?(?:analysis|output|tickets|milestones)[^`]*`([^`]+\.md)`/i) || raw.match(/to `([^`]+\.md)`|for the `([^`]+\.md)`/);
  if (cursorMd) structured.output_format.target_file = cursorMd[0];
  else if (backtickMd) structured.output_format.target_file = (backtickMd[1] || backtickMd[2] || "").trim();

  // User placeholder: after last --- (line like "## Error / log information (pasted by user)" or "Ticket appended by app")
  const lastHr = raw.lastIndexOf("\n---");
  if (lastHr !== -1) {
    const after = raw.slice(lastHr + 4).trim();
    if (after && !after.startsWith("*Edit") && !after.startsWith("*This prompt")) {
      const firstLine = after.split("\n")[0].trim();
      if (firstLine.startsWith("## ") || /pasted by user|appended below/i.test(firstLine)) structured.user_placeholder_note = firstLine;
    }
  }

  return structured;
}

function buildTemplate(raw, structured, sourceFile) {
  const hasPlaceholder =
    structured.user_placeholder_note.length > 0 ||
    sourceFile === "implement-all.prompt.md" ||
    /appended below by the app|pasted by user/i.test(raw);
  let templateStr = raw;
  if (structured.user_placeholder_note) {
    templateStr = raw.replace(/\s*---\s*\n## Error \/ log information[\s\S]*$/i, "\n\n{{appended_content}}").trim();
  } else if (sourceFile === "implement-all.prompt.md") {
    templateStr = raw.trimEnd() + "\n\n{{appended_content}}";
  }
  const templateVariables = hasPlaceholder ? ["appended_content"] : [];
  const name = structured.title || sourceFile.replace(/\.prompt\.md$/, "");
  const tags = [];
  if (sourceFile.includes("night-shift") || sourceFile.includes("implement-all") || sourceFile.includes("fix-bug") || sourceFile.includes("create") || sourceFile.includes("refactor") || sourceFile.includes("test") || sourceFile.includes("debugging")) tags.push("worker", "cursor-auto");
  if (sourceFile.includes("analyze") || sourceFile.includes("idea") || sourceFile.includes("milestone") || sourceFile.includes("tickets")) tags.push("idea-driven");
  if (["design", "architecture", "testing", "documentation", "project", "ideas", "frontend", "backend"].some((k) => sourceFile.startsWith(k))) tags.push("setup", "analyze");
  if (!tags.length) tags.push("prompt");

  return {
    template: templateStr,
    template_variables: templateVariables,
    metadata: {
      name,
      description: structured.role_or_intent.split("\n")[0].replace(/^You are\s+/, "").trim().slice(0, 120),
      version: "0.1.0",
      tags: [...new Set(tags)],
      cursor_mode: tags.includes("cursor-auto") ? "auto" : undefined,
    },
    client_parameters: { temperature: 0.2, max_tokens: 4096 },
    output_format: structured.output_format?.required_structure_markdown ? { description: "See structured.output_format", strict: false } : undefined,
  };
}

function main() {
  const files = fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".prompt.md"));
  for (const file of files) {
    const mdPath = path.join(PROMPTS_DIR, file);
    const raw = fs.readFileSync(mdPath, "utf-8");
    const structured = extractSections(raw);
    const prompt = buildTemplate(raw, structured, file);
    const out = {
      source_file: file,
      source_markdown: raw,
      structured,
      prompt,
    };
    const jsonPath = path.join(PROMPTS_DIR, file.replace(/\.md$/, ".json"));
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), "utf-8");
    console.log("Wrote", path.relative(REPO_ROOT, jsonPath));
  }
  console.log("Done. Generated", files.length, "JSON files.");
}

main();
