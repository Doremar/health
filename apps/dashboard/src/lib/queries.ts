import "server-only";
import { db } from "./db";
import type { Flag } from "@health/shared";

export interface MarkerSummary {
  code: string;
  name: string;
  last_value: number | null;
  last_value_text: string | null;
  unit: string | null;
  last_date: string;
  last_flag: Flag;
  ref_low: number | null;
  ref_high: number | null;
  last_panel: string | null;
  last_lab_name: string;
}

export function listMarkerSummaries(): MarkerSummary[] {
  return db().prepare(`
    SELECT m.code, m.name, m.value AS last_value, m.value_text AS last_value_text,
           m.unit, l.date AS last_date, m.flag AS last_flag,
           m.ref_low, m.ref_high,
           l.panel AS last_panel, l.lab_name AS last_lab_name
    FROM markers m
    JOIN labs l ON l.id = m.lab_id
    JOIN (
      SELECT m2.code, MAX(l2.date) AS max_date
      FROM markers m2 JOIN labs l2 ON l2.id = m2.lab_id
      GROUP BY m2.code
    ) latest ON latest.code = m.code AND latest.max_date = l.date
    ORDER BY (m.flag != 'normal') DESC, m.code
  `).all() as MarkerSummary[];
}

export interface MarkerHistoryPoint {
  date: string;
  value: number | null;
  unit: string | null;
  flag: Flag;
  lab_id: number;
  lab_name: string;
}

export function listMarkerHistory(code: string): MarkerHistoryPoint[] {
  return db().prepare(`
    SELECT l.date, m.value, m.unit, m.flag, l.id AS lab_id, l.lab_name
    FROM markers m JOIN labs l ON l.id = m.lab_id
    WHERE m.code = ?
    ORDER BY l.date
  `).all(code) as MarkerHistoryPoint[];
}

export function getMarkerMeta(code: string): { name: string; ref_low: number | null; ref_high: number | null; unit: string | null; panel: string | null } | null {
  return db().prepare(`
    SELECT m.name, m.ref_low, m.ref_high, m.unit, l.panel
    FROM markers m JOIN labs l ON l.id = m.lab_id
    WHERE m.code = ? ORDER BY m.id DESC LIMIT 1
  `).get(code) as any ?? null;
}

export interface LabHeader {
  id: number; date: string; lab_name: string; panel: string | null;
  source_file: string; needs_review: 0 | 1;
}

export function getLab(id: number): LabHeader | null {
  return db().prepare("SELECT id, date, lab_name, panel, source_file, needs_review FROM labs WHERE id = ?").get(id) as LabHeader | null;
}

export function listLabMarkers(labId: number) {
  return db().prepare(`
    SELECT code, name, value, value_text, unit, ref_low, ref_high, ref_text, flag
    FROM markers WHERE lab_id = ? ORDER BY id
  `).all(labId);
}

export function listAllLabs(): LabHeader[] {
  return db().prepare("SELECT id, date, lab_name, panel, source_file, needs_review FROM labs ORDER BY date DESC").all() as LabHeader[];
}

export function deleteLab(id: number): void {
  db().prepare("DELETE FROM labs WHERE id = ?").run(id);
}

export function countLabs(): number {
  return (db().prepare("SELECT COUNT(*) AS n FROM labs").get() as { n: number }).n;
}

export function listMarkerHistoryValues(code: string): number[] {
  const rows = db().prepare(`
    SELECT m.value FROM markers m JOIN labs l ON l.id = m.lab_id
    WHERE m.code = ? AND m.value IS NOT NULL
    ORDER BY l.date
  `).all(code) as { value: number }[];
  return rows.map((r) => r.value);
}

export interface MarkerCodeInfo {
  code: string;
  name: string;
  count: number;
}

export function listAllMarkerCodes(): MarkerCodeInfo[] {
  return db().prepare(`
    SELECT m.code,
           (SELECT name FROM markers WHERE code = m.code ORDER BY id DESC LIMIT 1) AS name,
           COUNT(*) AS count
    FROM markers m
    GROUP BY m.code
    ORDER BY m.code
  `).all() as MarkerCodeInfo[];
}

export function getPinnedOverrides(): Set<string> {
  const rows = db().prepare("SELECT code FROM marker_settings WHERE pinned = 1").all() as { code: string }[];
  return new Set(rows.map((r) => r.code));
}

export function togglePinned(code: string): void {
  const existing = db().prepare("SELECT pinned FROM marker_settings WHERE code = ?").get(code) as { pinned: number } | undefined;
  if (existing) {
    db().prepare("UPDATE marker_settings SET pinned = ? WHERE code = ?").run(existing.pinned ? 0 : 1, code);
  } else {
    db().prepare("INSERT INTO marker_settings (code, pinned) VALUES (?, 1)").run(code);
  }
}

// ============= Feelings =============

export interface FeelingRow {
  id: number;
  ts: string;
  chat_id: number | null;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  notes: string | null;
  source: string;
}

export function listRecentFeelings(limit = 50): FeelingRow[] {
  return db().prepare("SELECT * FROM feeling_logs ORDER BY ts DESC LIMIT ?").all(limit) as FeelingRow[];
}

export function getFeelingStats(): { count: number; avgMood: number | null; avgEnergy: number | null } {
  const row = db().prepare(
    "SELECT COUNT(*) AS count, AVG(mood) AS avgMood, AVG(energy) AS avgEnergy FROM feeling_logs"
  ).get() as { count: number; avgMood: number | null; avgEnergy: number | null };
  return row;
}

export function addManualFeeling(input: { mood: number; energy: number; notes?: string }): number {
  const info = db().prepare(
    "INSERT INTO feeling_logs (ts, mood, energy, notes, source) VALUES (?, ?, ?, ?, 'manual')"
  ).run(new Date().toISOString(), input.mood, input.energy, input.notes ?? null);
  return Number(info.lastInsertRowid);
}

// ============= Medications =============

export interface MedRow {
  id: number;
  name: string;
  dose: string | null;
  schedule_cron: string | null;
  schedule_hint: string | null;
  started_at: string;
  ended_at: string | null;
  active: 0 | 1;
  notes: string | null;
}

export function listMeds(includeInactive = false): MedRow[] {
  const sql = includeInactive
    ? "SELECT * FROM medications ORDER BY active DESC, id DESC"
    : "SELECT * FROM medications WHERE active = 1 ORDER BY id";
  return db().prepare(sql).all() as MedRow[];
}

export function getMedById(id: number): MedRow | null {
  return db().prepare("SELECT * FROM medications WHERE id = ?").get(id) as MedRow | null;
}

export function addMedRecord(input: {
  name: string;
  dose?: string;
  schedule_cron?: string;
  schedule_hint?: string;
  notes?: string;
}): number {
  const info = db().prepare(
    "INSERT INTO medications (name, dose, schedule_cron, schedule_hint, started_at, active, notes) VALUES (?, ?, ?, ?, ?, 1, ?)"
  ).run(
    input.name,
    input.dose ?? null,
    input.schedule_cron ?? null,
    input.schedule_hint ?? null,
    new Date().toISOString(),
    input.notes ?? null,
  );
  return Number(info.lastInsertRowid);
}

export function deactivateMedRecord(id: number): void {
  db().prepare("UPDATE medications SET active = 0, ended_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

export interface IntakeRow {
  id: number;
  med_id: number;
  scheduled_for: string | null;
  ts: string;
  status: "taken" | "skipped" | "snooze";
  notes: string | null;
  med_name: string;
}

export function listRecentIntakes(limit = 30): IntakeRow[] {
  return db().prepare(`
    SELECT i.*, m.name AS med_name
    FROM med_intakes i JOIN medications m ON m.id = i.med_id
    ORDER BY i.ts DESC LIMIT ?
  `).all(limit) as IntakeRow[];
}

export function getIntakeStats(medId: number): { taken: number; skipped: number; snooze: number } {
  const row = db().prepare(`
    SELECT
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) AS taken,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
      SUM(CASE WHEN status = 'snooze' THEN 1 ELSE 0 END) AS snooze
    FROM med_intakes WHERE med_id = ?
  `).get(medId) as { taken: number | null; skipped: number | null; snooze: number | null };
  return {
    taken: row.taken ?? 0,
    skipped: row.skipped ?? 0,
    snooze: row.snooze ?? 0,
  };
}
