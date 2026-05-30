import { getAccessToken } from "./oauth.js";
import { upsertCycle, upsertRecovery, upsertSleep, upsertWorkout } from "./db.js";

const API_BASE = "https://api.prod.whoop.com/developer/v2";

async function apiGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Whoop API ${res.status} ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface Paginated<T> {
  records: T[];
  next_token?: string | null;
}

async function fetchAllPages<T>(
  path: string,
  baseParams: Record<string, string>,
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null = null;
  let attempt = 0;
  do {
    const params: Record<string, string> = { ...baseParams, limit: "25" };
    if (nextToken) params.nextToken = nextToken;
    const page = await apiGet<Paginated<T>>(path, params);
    all.push(...page.records);
    nextToken = page.next_token ?? null;
    attempt++;
    if (attempt > 200) {
      console.warn(`[sync] aborting ${path} after 200 pages`);
      break;
    }
  } while (nextToken);
  return all;
}

interface WhoopCycle {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string | null;
  timezone_offset: string;
  score_state: string;
  score?: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score?: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

interface WhoopSleep {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string | null;
  timezone_offset: string;
  nap: boolean;
  score_state: string;
  score?: {
    stage_summary?: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed?: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number;
  };
}

interface WhoopWorkout {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string | null;
  timezone_offset: string;
  sport_id: number;
  sport_name?: string;
  score_state: string;
  score?: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
    altitude_change_meter?: number;
    zone_durations?: {
      zone_zero_milli?: number;
      zone_one_milli?: number;
      zone_two_milli?: number;
      zone_three_milli?: number;
      zone_four_milli?: number;
      zone_five_milli?: number;
    };
  };
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function syncRange(daysBack = 30): Promise<{
  cycles: number; recovery: number; sleeps: number; workouts: number;
}> {
  const start = isoDaysAgo(daysBack);
  const end = new Date().toISOString();
  console.log(`[sync] диапазон: ${start} → ${end}`);

  // Cycles
  const cycles = await fetchAllPages<WhoopCycle>("/cycle", { start, end });
  for (const c of cycles) {
    upsertCycle({
      whoop_id: c.id,
      start_ts: c.start,
      end_ts: c.end,
      timezone: c.timezone_offset,
      score_state: c.score_state,
      strain: c.score?.strain ?? null,
      kilojoules: c.score?.kilojoule ?? null,
      average_hr: c.score?.average_heart_rate ?? null,
      max_hr: c.score?.max_heart_rate ?? null,
    });
  }
  console.log(`[sync] cycles: ${cycles.length}`);

  // Recovery
  const recovery = await fetchAllPages<WhoopRecovery>("/recovery", { start, end });
  for (const r of recovery) {
    upsertRecovery({
      whoop_cycle_id: r.cycle_id,
      whoop_sleep_id: r.sleep_id ?? null,
      created_at: r.created_at,
      score_state: r.score_state,
      recovery_score: r.score?.recovery_score ?? null,
      resting_hr: r.score?.resting_heart_rate ?? null,
      hrv_rmssd_ms: r.score?.hrv_rmssd_milli ?? null,
      spo2_pct: r.score?.spo2_percentage ?? null,
      skin_temp_c: r.score?.skin_temp_celsius ?? null,
      user_calibrating: r.score?.user_calibrating ? 1 : 0,
    });
  }
  console.log(`[sync] recovery: ${recovery.length}`);

  // Sleep
  const sleeps = await fetchAllPages<WhoopSleep>("/activity/sleep", { start, end });
  for (const s of sleeps) {
    const ss = s.score?.stage_summary;
    upsertSleep({
      whoop_id: s.id,
      start_ts: s.start,
      end_ts: s.end,
      timezone: s.timezone_offset,
      nap: s.nap,
      score_state: s.score_state,
      total_in_bed_ms: ss?.total_in_bed_time_milli ?? null,
      total_awake_ms: ss?.total_awake_time_milli ?? null,
      total_light_sleep_ms: ss?.total_light_sleep_time_milli ?? null,
      total_slow_wave_sleep_ms: ss?.total_slow_wave_sleep_time_milli ?? null,
      total_rem_sleep_ms: ss?.total_rem_sleep_time_milli ?? null,
      sleep_efficiency_pct: s.score?.sleep_efficiency_percentage ?? null,
      disturbances: ss?.disturbance_count ?? null,
      respiratory_rate: s.score?.respiratory_rate ?? null,
      sleep_performance_pct: s.score?.sleep_performance_percentage ?? null,
      sleep_consistency_pct: s.score?.sleep_consistency_percentage ?? null,
      sleep_need_baseline_ms: s.score?.sleep_needed?.baseline_milli ?? null,
    });
  }
  console.log(`[sync] sleeps: ${sleeps.length}`);

  // Workouts
  const workouts = await fetchAllPages<WhoopWorkout>("/activity/workout", { start, end });
  for (const w of workouts) {
    const z = w.score?.zone_durations;
    upsertWorkout({
      whoop_id: w.id,
      start_ts: w.start,
      end_ts: w.end,
      timezone: w.timezone_offset,
      sport_id: w.sport_id,
      sport_name: w.sport_name ?? null,
      score_state: w.score_state,
      strain: w.score?.strain ?? null,
      average_hr: w.score?.average_heart_rate ?? null,
      max_hr: w.score?.max_heart_rate ?? null,
      kilojoules: w.score?.kilojoule ?? null,
      distance_meter: w.score?.distance_meter ?? null,
      altitude_gain_m: w.score?.altitude_gain_meter ?? null,
      zone_zero_ms: z?.zone_zero_milli ?? null,
      zone_one_ms: z?.zone_one_milli ?? null,
      zone_two_ms: z?.zone_two_milli ?? null,
      zone_three_ms: z?.zone_three_milli ?? null,
      zone_four_ms: z?.zone_four_milli ?? null,
      zone_five_ms: z?.zone_five_milli ?? null,
    });
  }
  console.log(`[sync] workouts: ${workouts.length}`);

  return {
    cycles: cycles.length,
    recovery: recovery.length,
    sleeps: sleeps.length,
    workouts: workouts.length,
  };
}
