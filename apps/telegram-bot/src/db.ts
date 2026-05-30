import Database from "better-sqlite3";
import { VAULT } from "@health/shared";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(VAULT.db);
  _db.pragma("foreign_keys = ON");
  _db.pragma("journal_mode = WAL");
  return _db;
}

// ============= Telegram users =============

export interface TgUser {
  chat_id: number;
  username: string | null;
  first_name: string | null;
  registered_at: string;
  is_primary: 0 | 1;
}

export function upsertUser(u: {
  chat_id: number;
  username?: string;
  first_name?: string;
}): TgUser {
  const existing = db().prepare("SELECT * FROM telegram_users WHERE chat_id = ?").get(u.chat_id) as TgUser | undefined;
  if (existing) {
    db().prepare("UPDATE telegram_users SET username = ?, first_name = ? WHERE chat_id = ?")
      .run(u.username ?? existing.username, u.first_name ?? existing.first_name, u.chat_id);
    return { ...existing, username: u.username ?? existing.username, first_name: u.first_name ?? existing.first_name };
  }
  // Первый пользователь = primary
  const count = (db().prepare("SELECT COUNT(*) AS n FROM telegram_users").get() as { n: number }).n;
  const isPrimary = count === 0 ? 1 : 0;
  db().prepare(
    "INSERT INTO telegram_users (chat_id, username, first_name, registered_at, is_primary) VALUES (?, ?, ?, ?, ?)"
  ).run(u.chat_id, u.username ?? null, u.first_name ?? null, new Date().toISOString(), isPrimary);
  return {
    chat_id: u.chat_id,
    username: u.username ?? null,
    first_name: u.first_name ?? null,
    registered_at: new Date().toISOString(),
    is_primary: isPrimary as 0 | 1,
  };
}

export function listUsers(): TgUser[] {
  return db().prepare("SELECT * FROM telegram_users ORDER BY is_primary DESC, registered_at").all() as TgUser[];
}

export function getPrimaryChatId(): number | null {
  const row = db().prepare("SELECT chat_id FROM telegram_users WHERE is_primary = 1 LIMIT 1").get() as { chat_id: number } | undefined;
  return row?.chat_id ?? null;
}

// ============= Feeling logs =============

export interface FeelingInput {
  chat_id: number;
  mood?: number;
  energy?: number;
  sleep_hours?: number;
  notes?: string;
}

export function logFeeling(input: FeelingInput): number {
  const info = db().prepare(
    "INSERT INTO feeling_logs (ts, chat_id, mood, energy, sleep_hours, notes, source) VALUES (?, ?, ?, ?, ?, ?, 'telegram')"
  ).run(
    new Date().toISOString(),
    input.chat_id,
    input.mood ?? null,
    input.energy ?? null,
    input.sleep_hours ?? null,
    input.notes ?? null,
  );
  return Number(info.lastInsertRowid);
}

// ============= Medications =============

export interface Medication {
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

export function addMedication(m: {
  name: string;
  dose?: string;
  schedule_cron?: string;
  schedule_hint?: string;
  notes?: string;
}): number {
  const info = db().prepare(
    "INSERT INTO medications (name, dose, schedule_cron, schedule_hint, started_at, active, notes) VALUES (?, ?, ?, ?, ?, 1, ?)"
  ).run(
    m.name,
    m.dose ?? null,
    m.schedule_cron ?? null,
    m.schedule_hint ?? null,
    new Date().toISOString(),
    m.notes ?? null,
  );
  return Number(info.lastInsertRowid);
}

export function listActiveMeds(): Medication[] {
  return db().prepare("SELECT * FROM medications WHERE active = 1 ORDER BY id").all() as Medication[];
}

export function getMed(id: number): Medication | null {
  return db().prepare("SELECT * FROM medications WHERE id = ?").get(id) as Medication | null;
}

export function deactivateMed(id: number): void {
  db().prepare("UPDATE medications SET active = 0, ended_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

export function logIntake(input: {
  med_id: number;
  scheduled_for?: string;
  status: "taken" | "skipped" | "snooze";
  notes?: string;
}): number {
  const info = db().prepare(
    "INSERT INTO med_intakes (med_id, scheduled_for, ts, status, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(
    input.med_id,
    input.scheduled_for ?? null,
    new Date().toISOString(),
    input.status,
    input.notes ?? null,
  );
  return Number(info.lastInsertRowid);
}

// ============= Nutrition =============

export interface NutritionInput {
  ts?: string;
  chat_id: number;
  description?: string;
  image_path?: string;
  calories?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  fiber_g?: number;
  source: "telegram_photo" | "telegram_text" | "manual";
  confidence?: "high" | "medium" | "low";
  notes?: string;
  raw_response?: string;
}

export function logNutrition(input: NutritionInput): number {
  const info = db().prepare(`
    INSERT INTO nutrition_logs
      (ts, chat_id, description, image_path, calories, protein_g, fat_g, carbs_g, fiber_g, source, confidence, notes, raw_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.ts ?? new Date().toISOString(),
    input.chat_id,
    input.description ?? null,
    input.image_path ?? null,
    input.calories ?? null,
    input.protein_g ?? null,
    input.fat_g ?? null,
    input.carbs_g ?? null,
    input.fiber_g ?? null,
    input.source,
    input.confidence ?? null,
    input.notes ?? null,
    input.raw_response ?? null,
  );
  return Number(info.lastInsertRowid);
}

export interface NutritionTarget {
  daily_calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export function getTarget(): NutritionTarget {
  return db().prepare(
    "SELECT daily_calories, protein_g, fat_g, carbs_g FROM nutrition_targets WHERE id = 1"
  ).get() as NutritionTarget;
}

export function setTarget(t: NutritionTarget): void {
  db().prepare(`
    UPDATE nutrition_targets
       SET daily_calories = ?, protein_g = ?, fat_g = ?, carbs_g = ?, updated_at = ?
     WHERE id = 1
  `).run(t.daily_calories, t.protein_g, t.fat_g, t.carbs_g, new Date().toISOString());
}

export function getTodayTotal(): { calories: number; protein_g: number; fat_g: number; carbs_g: number; count: number } {
  const row = db().prepare(`
    SELECT
      COALESCE(SUM(calories), 0) AS calories,
      COALESCE(SUM(protein_g), 0) AS protein_g,
      COALESCE(SUM(fat_g), 0)    AS fat_g,
      COALESCE(SUM(carbs_g), 0)  AS carbs_g,
      COUNT(*) AS count
    FROM nutrition_logs
    WHERE date(ts, 'localtime') = date('now', 'localtime')
  `).get() as { calories: number; protein_g: number; fat_g: number; carbs_g: number; count: number };
  return row;
}

export function listTodayMeals(): Array<{
  id: number; ts: string; description: string | null;
  calories: number | null; protein_g: number | null; fat_g: number | null; carbs_g: number | null;
}> {
  return db().prepare(`
    SELECT id, ts, description, calories, protein_g, fat_g, carbs_g
    FROM nutrition_logs
    WHERE date(ts, 'localtime') = date('now', 'localtime')
    ORDER BY ts
  `).all() as any;
}

export function deleteNutritionLog(id: number): void {
  db().prepare("DELETE FROM nutrition_logs WHERE id = ?").run(id);
}
