import fs from "node:fs";
import path from "node:path";
import type { Flag } from "@health/shared";
import type DatabaseSync from "better-sqlite3";

export interface MarkdownLab {
  date: string;
  lab_name: string;
  panel: string | null;
  source_file: string;
}

export interface MarkdownMarker {
  code: string;
  name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: Flag;
}

export interface MarkdownInput {
  lab: MarkdownLab;
  markers: MarkdownMarker[];
}

function valueCell(m: MarkdownMarker): string {
  const v = m.value !== null ? m.value : m.value_text ?? "—";
  return m.unit ? `${v} ${m.unit}` : `${v}`;
}

function refCell(m: MarkdownMarker): string {
  if (m.ref_low !== null && m.ref_high !== null) {
    return m.unit ? `${m.ref_low}–${m.ref_high} ${m.unit}` : `${m.ref_low}–${m.ref_high}`;
  }
  if (m.ref_text) return m.ref_text;
  return "—";
}

function flagBadge(f: Flag): string {
  switch (f) {
    case "low": return "⬇ low";
    case "high": return "⬆ high";
    case "critical": return "⛔ critical";
    case "normal": return "✓";
  }
}

export function renderLabMarkdown({ lab, markers }: MarkdownInput): string {
  const abnormal = markers.filter((m) => m.flag !== "normal");
  const labSlug = lab.lab_name.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push("---");
  lines.push(`created: ${today}`);
  lines.push(`updated: ${today}`);
  lines.push(`date: ${lab.date}`);
  lines.push(`lab: ${lab.lab_name}`);
  if (lab.panel) lines.push(`panel: ${lab.panel}`);
  lines.push("type: lab-result");
  lines.push("status: active");
  lines.push(`tags: [health, labs, ${labSlug}]`);
  lines.push(`source: "${lab.source_file}"`);
  lines.push(`abnormal_markers: [${abnormal.map((m) => m.code).join(", ")}]`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${lab.panel ? lab.panel + " — " : ""}${lab.lab_name} — ${lab.date}`);
  lines.push("");

  if (abnormal.length > 0) {
    lines.push("## ⚠ Отклонения");
    lines.push("");
    lines.push("| Показатель | Значение | Норма | Флаг |");
    lines.push("|------------|----------|-------|------|");
    for (const m of abnormal) {
      lines.push(`| ${m.name} | ${valueCell(m)} | ${refCell(m)} | ${flagBadge(m.flag)} |`);
    }
    lines.push("");
  }

  lines.push("## Все показатели");
  lines.push("");
  lines.push("| Код | Название | Значение | Норма |");
  lines.push("|-----|----------|----------|-------|");
  for (const m of markers) {
    lines.push(`| ${m.code} | ${m.name} | ${valueCell(m)} | ${refCell(m)} |`);
  }
  lines.push("");
  lines.push(`[Открыть оригинал PDF](../${lab.source_file})`);
  lines.push("");

  return lines.join("\n");
}

export async function regenerateAllMarkdown(db: DatabaseSync.Database): Promise<number> {
  // Lazy-import VAULT to avoid requiring HEALTH_VAULT_PATH at module load time
  const { VAULT } = await import("@health/shared");

  // Clear vault/labs/*.md (but not .gitkeep)
  for (const f of fs.readdirSync(VAULT.labs)) {
    if (f.endsWith(".md")) fs.unlinkSync(path.join(VAULT.labs, f));
  }

  const labs = db.prepare("SELECT * FROM labs ORDER BY date").all() as Array<{
    id: number; date: string; lab_name: string; panel: string | null; source_file: string;
  }>;

  let count = 0;
  for (const lab of labs) {
    const markers = db.prepare(`
      SELECT code, name, value, value_text, unit, ref_low, ref_high, ref_text, flag
      FROM markers WHERE lab_id = ? ORDER BY id
    `).all(lab.id) as MarkdownMarker[];

    const ext = path.extname(lab.source_file);
    const mdName = path.basename(lab.source_file).replace(ext, ".md");
    const md = renderLabMarkdown({
      lab: { date: lab.date, lab_name: lab.lab_name, panel: lab.panel, source_file: lab.source_file },
      markers,
    });
    fs.writeFileSync(path.join(VAULT.labs, mdName), md);
    count++;
  }
  return count;
}
