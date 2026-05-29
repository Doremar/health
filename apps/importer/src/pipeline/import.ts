import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { VAULT } from "@health/shared";
import { fileHash } from "./hash.js";
import { parseLabViaClaude } from "./claude.js";
import { resolveCanonicalCode } from "./normalize.js";
import { computeFlag } from "./flag.js";
import { persistLab } from "./persist.js";
import { renderLabMarkdown } from "./markdown.js";
import { logLine } from "../log.js";

export type ImportStatus = "imported" | "duplicate" | "quarantined";
export interface ImportResult {
  status: ImportStatus;
  reason?: string;
  labId?: number;
}

export interface ImportOptions {
  claudeRunner?: (prompt: string) => Promise<string>;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function moveToQuarantine(filePath: string, reason: string): void {
  const dest = path.join(VAULT.quarantine, path.basename(filePath));
  fs.renameSync(filePath, dest);
  logLine("warn", `quarantine: ${path.basename(filePath)} — ${reason}`);
}

export async function importFile(
  db: Database.Database,
  filePath: string,
  opts: ImportOptions = {},
): Promise<ImportResult> {
  const fileName = path.basename(filePath);

  // 1. Hash + duplicate check
  const hash = await fileHash(filePath);
  const dup = db.prepare("SELECT id FROM labs WHERE source_hash = ?").get(hash) as { id: number } | undefined;
  if (dup) {
    fs.unlinkSync(filePath);
    logLine("info", `duplicate: ${fileName} (lab #${dup.id})`);
    return { status: "duplicate", labId: dup.id };
  }

  // 2. Parse via Claude
  let parsed;
  try {
    parsed = await parseLabViaClaude(filePath, { runner: opts.claudeRunner, maxRetries: 3 });
  } catch (e) {
    moveToQuarantine(filePath, `parse failed: ${(e as Error).message}`);
    return { status: "quarantined", reason: "parse_failed" };
  }

  // 3. Not a lab → quarantine
  if (!parsed.is_lab_result) {
    moveToQuarantine(filePath, "is_lab_result=false");
    return { status: "quarantined", reason: "not_a_lab" };
  }

  // 4. Markers: code normalization + flag
  const enrichedMarkers = parsed.markers.map((m) => ({
    code: resolveCanonicalCode(db, m.name),
    name: m.name,
    value: m.value,
    value_text: m.value_text,
    unit: m.unit,
    ref_low: m.ref_low,
    ref_high: m.ref_high,
    ref_text: m.ref_text,
    flag: computeFlag(m.value, m.ref_low, m.ref_high),
  }));

  // 5. Move to originals/ with final name
  const ext = path.extname(filePath);
  const finalName = `${parsed.date}-${slug(parsed.lab_name)}${parsed.panel ? "-" + slug(parsed.panel) : ""}${ext}`;
  const finalPath = path.join(VAULT.originals, finalName);
  fs.renameSync(filePath, finalPath);
  const relSource = path.join("originals", finalName);

  // 6. Persist
  const labId = persistLab(db, {
    date: parsed.date,
    lab_name: parsed.lab_name,
    panel: parsed.panel,
    source_file: relSource,
    source_hash: hash,
    needs_review: parsed.confidence === "low" ? 1 : 0,
    markers: enrichedMarkers,
  });

  // 7. Markdown
  const mdPath = path.join(VAULT.labs, finalName.replace(ext, ".md"));
  const md = renderLabMarkdown({
    lab: { date: parsed.date, lab_name: parsed.lab_name, panel: parsed.panel, source_file: relSource },
    markers: enrichedMarkers,
  });
  fs.writeFileSync(mdPath, md);

  logLine("info", `imported: ${finalName} (lab #${labId}, ${enrichedMarkers.length} markers)`);
  return { status: "imported", labId };
}
