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

// ============ OAuth ============

export interface WhoopAuth {
  id: 1;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  whoop_user_id: number | null;
  updated_at: string;
}

export function getAuth(): WhoopAuth | null {
  return db().prepare("SELECT * FROM whoop_auth WHERE id = 1").get() as WhoopAuth | null;
}

export function saveAuth(input: {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope?: string;
  whoop_user_id?: number;
}): void {
  const now = new Date().toISOString();
  db().prepare(`
    INSERT INTO whoop_auth (id, access_token, refresh_token, expires_at, scope, whoop_user_id, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      scope = COALESCE(excluded.scope, whoop_auth.scope),
      whoop_user_id = COALESCE(excluded.whoop_user_id, whoop_auth.whoop_user_id),
      updated_at = excluded.updated_at
  `).run(
    input.access_token,
    input.refresh_token,
    input.expires_at,
    input.scope ?? null,
    input.whoop_user_id ?? null,
    now,
  );
}

// ============ Cycles ============

export function upsertCycle(c: {
  whoop_id: number;
  start_ts: string;
  end_ts: string | null;
  timezone: string | null;
  score_state: string | null;
  strain: number | null;
  kilojoules: number | null;
  average_hr: number | null;
  max_hr: number | null;
}): void {
  db().prepare(`
    INSERT INTO whoop_cycles (whoop_id, start_ts, end_ts, timezone, score_state, strain, kilojoules, average_hr, max_hr, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(whoop_id) DO UPDATE SET
      end_ts = excluded.end_ts,
      score_state = excluded.score_state,
      strain = excluded.strain,
      kilojoules = excluded.kilojoules,
      average_hr = excluded.average_hr,
      max_hr = excluded.max_hr,
      imported_at = excluded.imported_at
  `).run(
    c.whoop_id, c.start_ts, c.end_ts, c.timezone, c.score_state,
    c.strain, c.kilojoules, c.average_hr, c.max_hr,
    new Date().toISOString(),
  );
}

// ============ Recovery ============

export function upsertRecovery(r: {
  whoop_cycle_id: number;
  whoop_sleep_id: number | null;
  created_at: string;
  score_state: string | null;
  recovery_score: number | null;
  resting_hr: number | null;
  hrv_rmssd_ms: number | null;
  spo2_pct: number | null;
  skin_temp_c: number | null;
  user_calibrating: number | null;
}): void {
  db().prepare(`
    INSERT INTO whoop_recovery (whoop_cycle_id, whoop_sleep_id, created_at, score_state, recovery_score,
                                resting_hr, hrv_rmssd_ms, spo2_pct, skin_temp_c, user_calibrating, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(whoop_cycle_id) DO UPDATE SET
      whoop_sleep_id = excluded.whoop_sleep_id,
      score_state = excluded.score_state,
      recovery_score = excluded.recovery_score,
      resting_hr = excluded.resting_hr,
      hrv_rmssd_ms = excluded.hrv_rmssd_ms,
      spo2_pct = excluded.spo2_pct,
      skin_temp_c = excluded.skin_temp_c,
      user_calibrating = excluded.user_calibrating,
      imported_at = excluded.imported_at
  `).run(
    r.whoop_cycle_id, r.whoop_sleep_id, r.created_at, r.score_state, r.recovery_score,
    r.resting_hr, r.hrv_rmssd_ms, r.spo2_pct, r.skin_temp_c, r.user_calibrating,
    new Date().toISOString(),
  );
}

// ============ Sleeps ============

export function upsertSleep(s: {
  whoop_id: number;
  start_ts: string;
  end_ts: string | null;
  timezone: string | null;
  nap: boolean;
  score_state: string | null;
  total_in_bed_ms: number | null;
  total_awake_ms: number | null;
  total_light_sleep_ms: number | null;
  total_slow_wave_sleep_ms: number | null;
  total_rem_sleep_ms: number | null;
  sleep_efficiency_pct: number | null;
  disturbances: number | null;
  respiratory_rate: number | null;
  sleep_performance_pct: number | null;
  sleep_consistency_pct: number | null;
  sleep_need_baseline_ms: number | null;
}): void {
  db().prepare(`
    INSERT INTO whoop_sleeps (whoop_id, start_ts, end_ts, timezone, nap, score_state,
                              total_in_bed_ms, total_awake_ms, total_light_sleep_ms,
                              total_slow_wave_sleep_ms, total_rem_sleep_ms,
                              sleep_efficiency_pct, disturbances, respiratory_rate,
                              sleep_performance_pct, sleep_consistency_pct, sleep_need_baseline_ms,
                              imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(whoop_id) DO UPDATE SET
      end_ts = excluded.end_ts, score_state = excluded.score_state,
      total_in_bed_ms = excluded.total_in_bed_ms, total_awake_ms = excluded.total_awake_ms,
      total_light_sleep_ms = excluded.total_light_sleep_ms,
      total_slow_wave_sleep_ms = excluded.total_slow_wave_sleep_ms,
      total_rem_sleep_ms = excluded.total_rem_sleep_ms,
      sleep_efficiency_pct = excluded.sleep_efficiency_pct,
      disturbances = excluded.disturbances, respiratory_rate = excluded.respiratory_rate,
      sleep_performance_pct = excluded.sleep_performance_pct,
      sleep_consistency_pct = excluded.sleep_consistency_pct,
      sleep_need_baseline_ms = excluded.sleep_need_baseline_ms,
      imported_at = excluded.imported_at
  `).run(
    s.whoop_id, s.start_ts, s.end_ts, s.timezone, s.nap ? 1 : 0, s.score_state,
    s.total_in_bed_ms, s.total_awake_ms, s.total_light_sleep_ms,
    s.total_slow_wave_sleep_ms, s.total_rem_sleep_ms,
    s.sleep_efficiency_pct, s.disturbances, s.respiratory_rate,
    s.sleep_performance_pct, s.sleep_consistency_pct, s.sleep_need_baseline_ms,
    new Date().toISOString(),
  );
}

// ============ Workouts ============

export function upsertWorkout(w: {
  whoop_id: number;
  start_ts: string;
  end_ts: string | null;
  timezone: string | null;
  sport_id: number | null;
  sport_name: string | null;
  score_state: string | null;
  strain: number | null;
  average_hr: number | null;
  max_hr: number | null;
  kilojoules: number | null;
  distance_meter: number | null;
  altitude_gain_m: number | null;
  zone_zero_ms: number | null;
  zone_one_ms: number | null;
  zone_two_ms: number | null;
  zone_three_ms: number | null;
  zone_four_ms: number | null;
  zone_five_ms: number | null;
}): void {
  db().prepare(`
    INSERT INTO whoop_workouts (whoop_id, start_ts, end_ts, timezone, sport_id, sport_name, score_state,
                                strain, average_hr, max_hr, kilojoules, distance_meter, altitude_gain_m,
                                zone_zero_ms, zone_one_ms, zone_two_ms, zone_three_ms, zone_four_ms, zone_five_ms,
                                imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(whoop_id) DO UPDATE SET
      end_ts = excluded.end_ts, sport_id = excluded.sport_id, sport_name = excluded.sport_name,
      score_state = excluded.score_state, strain = excluded.strain,
      average_hr = excluded.average_hr, max_hr = excluded.max_hr,
      kilojoules = excluded.kilojoules, distance_meter = excluded.distance_meter,
      altitude_gain_m = excluded.altitude_gain_m,
      zone_zero_ms = excluded.zone_zero_ms, zone_one_ms = excluded.zone_one_ms,
      zone_two_ms = excluded.zone_two_ms, zone_three_ms = excluded.zone_three_ms,
      zone_four_ms = excluded.zone_four_ms, zone_five_ms = excluded.zone_five_ms,
      imported_at = excluded.imported_at
  `).run(
    w.whoop_id, w.start_ts, w.end_ts, w.timezone, w.sport_id, w.sport_name, w.score_state,
    w.strain, w.average_hr, w.max_hr, w.kilojoules, w.distance_meter, w.altitude_gain_m,
    w.zone_zero_ms, w.zone_one_ms, w.zone_two_ms, w.zone_three_ms, w.zone_four_ms, w.zone_five_ms,
    new Date().toISOString(),
  );
}
