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

// ============= Whoop =============

export interface WhoopRecoveryRow {
  whoop_cycle_id: number;
  created_at: string;
  recovery_score: number | null;
  resting_hr: number | null;
  hrv_rmssd_ms: number | null;
}

export interface WhoopCycleRow {
  whoop_id: number;
  start_ts: string;
  end_ts: string | null;
  strain: number | null;
  kilojoules: number | null;
  average_hr: number | null;
  max_hr: number | null;
}

export interface WhoopSleepRow {
  whoop_id: number;
  start_ts: string;
  end_ts: string | null;
  nap: 0 | 1;
  total_in_bed_ms: number | null;
  total_awake_ms: number | null;
  total_rem_sleep_ms: number | null;
  total_slow_wave_sleep_ms: number | null;
  total_light_sleep_ms: number | null;
  sleep_efficiency_pct: number | null;
  sleep_performance_pct: number | null;
  disturbances: number | null;
  respiratory_rate: number | null;
}

export interface WhoopWorkoutRow {
  whoop_id: number;
  start_ts: string;
  end_ts: string | null;
  sport_name: string | null;
  strain: number | null;
  average_hr: number | null;
  max_hr: number | null;
  kilojoules: number | null;
  distance_meter: number | null;
}

export function isWhoopConnected(): boolean {
  try {
    const row = db().prepare("SELECT 1 AS x FROM whoop_auth WHERE id = 1").get();
    return !!row;
  } catch {
    return false;
  }
}

export function listRecentRecovery(limit = 30): WhoopRecoveryRow[] {
  return db().prepare(
    "SELECT whoop_cycle_id, created_at, recovery_score, resting_hr, hrv_rmssd_ms FROM whoop_recovery ORDER BY created_at DESC LIMIT ?"
  ).all(limit) as WhoopRecoveryRow[];
}

export function listRecentCycles(limit = 30): WhoopCycleRow[] {
  return db().prepare(
    "SELECT whoop_id, start_ts, end_ts, strain, kilojoules, average_hr, max_hr FROM whoop_cycles ORDER BY start_ts DESC LIMIT ?"
  ).all(limit) as WhoopCycleRow[];
}

export function listRecentSleeps(limit = 30): WhoopSleepRow[] {
  return db().prepare(
    `SELECT whoop_id, start_ts, end_ts, nap,
            total_in_bed_ms, total_awake_ms, total_rem_sleep_ms,
            total_slow_wave_sleep_ms, total_light_sleep_ms,
            sleep_efficiency_pct, sleep_performance_pct, disturbances, respiratory_rate
     FROM whoop_sleeps ORDER BY start_ts DESC LIMIT ?`
  ).all(limit) as WhoopSleepRow[];
}

export function listRecentWorkouts(limit = 30): WhoopWorkoutRow[] {
  return db().prepare(
    `SELECT whoop_id, start_ts, end_ts, sport_name, strain,
            average_hr, max_hr, kilojoules, distance_meter
     FROM whoop_workouts ORDER BY start_ts DESC LIMIT ?`
  ).all(limit) as WhoopWorkoutRow[];
}

// ============= Nutrition =============

export interface NutritionLogRow {
  id: number;
  ts: string;
  description: string | null;
  image_path: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  source: string;
  confidence: string | null;
}

export interface NutritionDailyTotal {
  date: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  count: number;
}

export interface NutritionTargetRow {
  daily_calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export function getNutritionTarget(): NutritionTargetRow {
  return db().prepare(
    "SELECT daily_calories, protein_g, fat_g, carbs_g FROM nutrition_targets WHERE id = 1"
  ).get() as NutritionTargetRow;
}

export function getNutritionToday(): NutritionDailyTotal {
  const row = db().prepare(`
    SELECT
      date('now', 'localtime') AS date,
      COALESCE(SUM(calories), 0) AS calories,
      COALESCE(SUM(protein_g), 0) AS protein_g,
      COALESCE(SUM(fat_g), 0)    AS fat_g,
      COALESCE(SUM(carbs_g), 0)  AS carbs_g,
      COUNT(*) AS count
    FROM nutrition_logs
    WHERE date(ts, 'localtime') = date('now', 'localtime')
  `).get() as NutritionDailyTotal;
  return row;
}

export function listNutritionToday(): NutritionLogRow[] {
  return db().prepare(`
    SELECT id, ts, description, image_path, calories, protein_g, fat_g, carbs_g, fiber_g, source, confidence
    FROM nutrition_logs
    WHERE date(ts, 'localtime') = date('now', 'localtime')
    ORDER BY ts
  `).all() as NutritionLogRow[];
}

export function listNutritionByDay(days = 14): NutritionDailyTotal[] {
  return db().prepare(`
    SELECT
      date(ts, 'localtime') AS date,
      COALESCE(SUM(calories), 0) AS calories,
      COALESCE(SUM(protein_g), 0) AS protein_g,
      COALESCE(SUM(fat_g), 0)    AS fat_g,
      COALESCE(SUM(carbs_g), 0)  AS carbs_g,
      COUNT(*) AS count
    FROM nutrition_logs
    WHERE date(ts, 'localtime') >= date('now', 'localtime', ?)
    GROUP BY date(ts, 'localtime')
    ORDER BY date DESC
  `).all(`-${days} days`) as NutritionDailyTotal[];
}

export function setNutritionTarget(t: NutritionTargetRow): void {
  db().prepare(`
    UPDATE nutrition_targets
       SET daily_calories = ?, protein_g = ?, fat_g = ?, carbs_g = ?, updated_at = ?
     WHERE id = 1
  `).run(t.daily_calories, t.protein_g, t.fat_g, t.carbs_g, new Date().toISOString());
}

export function deleteNutritionLog(id: number): void {
  db().prepare("DELETE FROM nutrition_logs WHERE id = ?").run(id);
}

export function getWhoopSummary(): {
  latestRecovery: number | null;
  latestStrain: number | null;
  latestSleepDurationMs: number | null;
  hrvAvg7d: number | null;
} {
  const latestRec = db().prepare("SELECT recovery_score FROM whoop_recovery ORDER BY created_at DESC LIMIT 1")
    .get() as { recovery_score: number | null } | undefined;
  const latestCyc = db().prepare("SELECT strain FROM whoop_cycles ORDER BY start_ts DESC LIMIT 1")
    .get() as { strain: number | null } | undefined;
  const latestSleep = db().prepare(`
    SELECT (COALESCE(total_in_bed_ms,0) - COALESCE(total_awake_ms,0)) AS dur
    FROM whoop_sleeps WHERE nap = 0 ORDER BY start_ts DESC LIMIT 1
  `).get() as { dur: number | null } | undefined;
  const hrv = db().prepare(`
    SELECT AVG(hrv_rmssd_ms) AS avg
    FROM whoop_recovery
    WHERE created_at >= datetime('now', '-7 days') AND hrv_rmssd_ms IS NOT NULL
  `).get() as { avg: number | null } | undefined;
  return {
    latestRecovery: latestRec?.recovery_score ?? null,
    latestStrain: latestCyc?.strain ?? null,
    latestSleepDurationMs: latestSleep?.dur ?? null,
    hrvAvg7d: hrv?.avg ?? null,
  };
}
