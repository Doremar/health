import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { VAULT } from "@health/shared";
import { fileHash } from "./hash.js";
import { parseLabViaClaude } from "./claude.js";
import { resolveCanonicalCode, slugify } from "./normalize.js";
import { computeFlag } from "./flag.js";
import { persistLab } from "./persist.js";
import { renderLabMarkdown } from "./markdown.js";
import { triageViaClaude } from "./triage.js";
import { parseStudyViaClaude } from "./study-claude.js";
import { persistStudy } from "./study-persist.js";
import { renderStudyMarkdown } from "./study-markdown.js";
import { logLine } from "../log.js";

export type ImportStatus = "imported" | "duplicate" | "quarantined";
export interface ImportResult {
  status: ImportStatus;
  reason?: string;
  labId?: number;
  studyId?: number;
  kind?: "lab" | "study";
}

export interface ImportOptions {
  claudeRunner?: (prompt: string) => Promise<string>;
  triageRunner?: (prompt: string) => Promise<string>;
  studyRunner?: (prompt: string) => Promise<string>;
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

  // 1. Дедуп по хешу — проверяем И labs И studies
  const hash = await fileHash(filePath);
  const dupLab = db.prepare("SELECT id FROM labs WHERE source_hash = ?").get(hash) as { id: number } | undefined;
  const dupStudy = db.prepare("SELECT id FROM studies WHERE source_hash = ?").get(hash) as { id: number } | undefined;
  if (dupLab || dupStudy) {
    fs.unlinkSync(filePath);
    const where = dupLab ? `lab #${dupLab.id}` : `study #${dupStudy!.id}`;
    logLine("info", `duplicate: ${fileName} (${where})`);
    return { status: "duplicate", labId: dupLab?.id, studyId: dupStudy?.id };
  }

  // 2. Триаж
  let triage;
  try {
    triage = await triageViaClaude(filePath, { runner: opts.triageRunner });
  } catch (e) {
    moveToQuarantine(filePath, `triage failed: ${(e as Error).message}`);
    return { status: "quarantined", reason: "triage_failed" };
  }

  // 3. Routing
  if (triage.kind === "other") {
    moveToQuarantine(filePath, `triage: other/${triage.confidence}`);
    return { status: "quarantined", reason: "not_medical" };
  }

  if (triage.kind === "lab") {
    if (triage.confidence === "low") {
      moveToQuarantine(filePath, "triage: lab/low — слишком неуверенно");
      return { status: "quarantined", reason: "lab_low_confidence" };
    }
    return await importAsLab(db, filePath, hash, opts);
  }

  // triage.kind === "study"
  return await importAsStudy(db, filePath, hash, triage.confidence, opts);
}

async function importAsLab(
  db: Database.Database, filePath: string, hash: string, opts: ImportOptions,
): Promise<ImportResult> {
  let parsed;
  try {
    parsed = await parseLabViaClaude(filePath, { runner: opts.claudeRunner, maxRetries: 3 });
  } catch (e) {
    moveToQuarantine(filePath, `lab parse failed: ${(e as Error).message}`);
    return { status: "quarantined", reason: "parse_failed", kind: "lab" };
  }
  if (!parsed.is_lab_result) {
    moveToQuarantine(filePath, "is_lab_result=false");
    return { status: "quarantined", reason: "not_a_lab", kind: "lab" };
  }

  const enriched = parsed.markers.map((m) => ({
    code: resolveCanonicalCode(db, m.name), name: m.name,
    value: m.value, value_text: m.value_text, unit: m.unit,
    ref_low: m.ref_low, ref_high: m.ref_high, ref_text: m.ref_text,
    flag: computeFlag(m.value, m.ref_low, m.ref_high),
  }));
  const ext = path.extname(filePath);
  const finalName = `${parsed.date}-${slugify(parsed.lab_name)}${parsed.panel ? "-" + slugify(parsed.panel) : ""}${ext}`;
  const finalPath = path.join(VAULT.originals, finalName);
  fs.renameSync(filePath, finalPath);
  const relSource = path.join("originals", finalName);

  const labId = persistLab(db, {
    date: parsed.date, lab_name: parsed.lab_name, panel: parsed.panel,
    source_file: relSource, source_hash: hash,
    needs_review: parsed.confidence === "low" ? 1 : 0,
    markers: enriched,
  });

  const mdPath = path.join(VAULT.labs, finalName.replace(ext, ".md"));
  fs.writeFileSync(mdPath, renderLabMarkdown({
    lab: { date: parsed.date, lab_name: parsed.lab_name, panel: parsed.panel, source_file: relSource },
    markers: enriched,
  }));
  logLine("info", `imported lab: ${finalName} (lab #${labId})`);
  return { status: "imported", labId, kind: "lab" };
}

async function importAsStudy(
  db: Database.Database, filePath: string, hash: string,
  triageConf: "high" | "medium" | "low", opts: ImportOptions,
): Promise<ImportResult> {
  let parsed;
  try {
    parsed = await parseStudyViaClaude(filePath, { runner: opts.studyRunner, maxRetries: 3 });
  } catch (e) {
    moveToQuarantine(filePath, `study parse failed: ${(e as Error).message}`);
    return { status: "quarantined", reason: "parse_failed", kind: "study" };
  }
  if (!parsed.is_study) {
    moveToQuarantine(filePath, "is_study=false");
    return { status: "quarantined", reason: "not_a_study", kind: "study" };
  }

  // Подготовка metrics: добавить flag
  const enrichedMetrics = parsed.metrics.map((m) => {
    let flag: string | null = null;
    if (m.value !== null && m.ref_low !== null && m.ref_high !== null) {
      if (m.value < m.ref_low) flag = "low";
      else if (m.value > m.ref_high) flag = "high";
      else flag = "normal";
    }
    return { ...m, flag };
  });

  // Имя файла
  const ext = path.extname(filePath);
  const organSlug = parsed.organ ? "-" + slugify(parsed.organ) : "";
  const finalName = `${parsed.date}-${parsed.type}${organSlug}${ext}`;
  const studiesOrig = path.join(VAULT.originals, "studies");
  fs.mkdirSync(studiesOrig, { recursive: true });
  const finalPath = path.join(studiesOrig, finalName);
  fs.renameSync(filePath, finalPath);
  const relSource = path.join("originals", "studies", finalName);

  const needsReview = (parsed.confidence === "low" || triageConf === "low") ? 1 : 0;

  const studyId = persistStudy(db, {
    date: parsed.date,
    type: parsed.type,
    modality: parsed.modality,
    organ: parsed.organ,
    facility: parsed.facility,
    doctor: parsed.doctor,
    conclusion: parsed.conclusion,
    findings: parsed.findings,
    recommendations: parsed.recommendations,
    source_file: relSource,
    source_hash: hash,
    needs_review: needsReview as 0 | 1,
    diagnoses: parsed.diagnoses,
    metrics: enrichedMetrics,
  });

  // Markdown
  const studiesMd = path.join(VAULT.root, "studies");
  fs.mkdirSync(studiesMd, { recursive: true });
  const mdPath = path.join(studiesMd, finalName.replace(ext, ".md"));
  fs.writeFileSync(mdPath, renderStudyMarkdown({
    study: {
      date: parsed.date, type: parsed.type, modality: parsed.modality,
      organ: parsed.organ, facility: parsed.facility, doctor: parsed.doctor,
      conclusion: parsed.conclusion, findings: parsed.findings,
      recommendations: parsed.recommendations, source_file: relSource,
    },
    diagnoses: parsed.diagnoses,
    metrics: enrichedMetrics,
  }));

  logLine("info", `imported study: ${finalName} (study #${studyId}, ${parsed.diagnoses.length} diag, ${parsed.metrics.length} metrics)`);
  return { status: "imported", studyId, kind: "study" };
}
