/**
 * Converts architecture records to Markdown for export and project spec.
 */
import type { ArchitectureRecord } from "@/types/architecture";

/** Full architecture record to .md for Project Spec export. */
export function architectureRecordToMarkdown(record: ArchitectureRecord): string {
  const lines: string[] = [];
  lines.push(`# ${record.name}`);
  lines.push("");
  lines.push(`- **ID:** \`${record.id}\``);
  lines.push(`- **Category:** ${record.category}`);
  if (record.created_at) lines.push(`- **Created:** ${record.created_at}`);
  if (record.updated_at) lines.push(`- **Updated:** ${record.updated_at}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Description");
  lines.push("");
  lines.push(record.description || "*No description.*");
  lines.push("");
  if (record.practices) {
    lines.push("## Practices / Principles");
    lines.push("");
    lines.push(record.practices);
    lines.push("");
  }
  if (record.scenarios) {
    lines.push("## Scenarios / When to use");
    lines.push("");
    lines.push(record.scenarios);
    lines.push("");
  }
  if (record.references) {
    lines.push("## References");
    lines.push("");
    lines.push(record.references);
    lines.push("");
  }
  if (record.anti_patterns) {
    lines.push("## Anti-patterns");
    lines.push("");
    lines.push(record.anti_patterns);
    lines.push("");
  }
  if (record.examples) {
    lines.push("## Examples");
    lines.push("");
    lines.push(record.examples);
    lines.push("");
  }
  if (record.extra_inputs && Object.keys(record.extra_inputs).length > 0) {
    lines.push("## Additional inputs");
    lines.push("");
    for (const [k, v] of Object.entries(record.extra_inputs)) {
      lines.push(`- **${k}:** ${v}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("*Exported from Architecture*");
  return lines.join("\n");
}
