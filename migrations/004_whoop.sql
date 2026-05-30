-- OAuth токены (один primary user — наш юзер)
CREATE TABLE IF NOT EXISTS whoop_auth (
  id              INTEGER PRIMARY KEY CHECK (id = 1),  -- один пользователь, единственная строка
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  expires_at      TEXT NOT NULL,                       -- ISO ts когда access_token истечёт
  scope           TEXT,
  whoop_user_id   INTEGER,
  updated_at      TEXT NOT NULL
);

-- Циклы Whoop (24-часовые периоды)
CREATE TABLE IF NOT EXISTS whoop_cycles (
  id             INTEGER PRIMARY KEY,
  whoop_id       INTEGER NOT NULL UNIQUE,
  start_ts       TEXT NOT NULL,
  end_ts         TEXT,
  timezone       TEXT,
  score_state    TEXT,                                 -- 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE'
  strain         REAL,
  kilojoules     REAL,
  average_hr     INTEGER,
  max_hr         INTEGER,
  imported_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cycles_start ON whoop_cycles(start_ts);

-- Recovery score
CREATE TABLE IF NOT EXISTS whoop_recovery (
  id                INTEGER PRIMARY KEY,
  whoop_cycle_id    INTEGER NOT NULL UNIQUE,
  whoop_sleep_id    INTEGER,
  created_at        TEXT NOT NULL,
  score_state       TEXT,
  recovery_score    INTEGER,                          -- 0..100
  resting_hr        INTEGER,
  hrv_rmssd_ms      REAL,
  spo2_pct          REAL,
  skin_temp_c       REAL,
  user_calibrating  INTEGER,
  imported_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recovery_created ON whoop_recovery(created_at);

-- Сон
CREATE TABLE IF NOT EXISTS whoop_sleeps (
  id                       INTEGER PRIMARY KEY,
  whoop_id                 INTEGER NOT NULL UNIQUE,
  start_ts                 TEXT NOT NULL,
  end_ts                   TEXT,
  timezone                 TEXT,
  nap                      INTEGER NOT NULL DEFAULT 0,
  score_state              TEXT,
  total_in_bed_ms          INTEGER,
  total_awake_ms           INTEGER,
  total_light_sleep_ms     INTEGER,
  total_slow_wave_sleep_ms INTEGER,
  total_rem_sleep_ms       INTEGER,
  sleep_efficiency_pct     REAL,
  disturbances             INTEGER,
  respiratory_rate         REAL,
  sleep_performance_pct    REAL,
  sleep_consistency_pct    REAL,
  sleep_need_baseline_ms   INTEGER,
  imported_at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sleeps_start ON whoop_sleeps(start_ts);

-- Тренировки
CREATE TABLE IF NOT EXISTS whoop_workouts (
  id                INTEGER PRIMARY KEY,
  whoop_id          INTEGER NOT NULL UNIQUE,
  start_ts          TEXT NOT NULL,
  end_ts            TEXT,
  timezone          TEXT,
  sport_id          INTEGER,
  sport_name        TEXT,
  score_state       TEXT,
  strain            REAL,
  average_hr        INTEGER,
  max_hr            INTEGER,
  kilojoules        REAL,
  distance_meter    REAL,
  altitude_gain_m   REAL,
  zone_zero_ms      INTEGER,
  zone_one_ms       INTEGER,
  zone_two_ms       INTEGER,
  zone_three_ms     INTEGER,
  zone_four_ms      INTEGER,
  zone_five_ms      INTEGER,
  imported_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workouts_start ON whoop_workouts(start_ts);

INSERT OR IGNORE INTO _schema (version) VALUES (4);
