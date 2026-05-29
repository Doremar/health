-- Telegram users (кто пользуется ботом)
CREATE TABLE IF NOT EXISTS telegram_users (
  chat_id        INTEGER PRIMARY KEY,
  username       TEXT,
  first_name     TEXT,
  registered_at  TEXT NOT NULL,
  is_primary     INTEGER NOT NULL DEFAULT 0
);

-- Журнал самочувствия (ответы из бота)
CREATE TABLE IF NOT EXISTS feeling_logs (
  id             INTEGER PRIMARY KEY,
  ts             TEXT NOT NULL,           -- ISO 8601
  chat_id        INTEGER REFERENCES telegram_users(chat_id),
  mood           INTEGER,                 -- 1..5
  energy         INTEGER,                 -- 1..5
  sleep_hours    REAL,
  notes          TEXT,
  source         TEXT NOT NULL DEFAULT 'telegram'  -- 'telegram' | 'manual'
);

CREATE INDEX IF NOT EXISTS idx_feeling_ts ON feeling_logs(ts);

-- Лекарства / БАД
CREATE TABLE IF NOT EXISTS medications (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  dose           TEXT,                    -- "500 мг", "1 капсула"
  schedule_cron  TEXT,                    -- node-cron expression, например "0 9,21 * * *"
  schedule_hint  TEXT,                    -- человеческое описание "утром и вечером"
  started_at     TEXT NOT NULL,
  ended_at       TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_meds_active ON medications(active);

-- Логи приёма (что выпил / что пропустил)
CREATE TABLE IF NOT EXISTS med_intakes (
  id             INTEGER PRIMARY KEY,
  med_id         INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_for  TEXT,                    -- когда было запланировано (ISO)
  ts             TEXT NOT NULL,           -- когда юзер ответил
  status         TEXT NOT NULL,           -- 'taken' | 'skipped' | 'snooze'
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_intakes_med ON med_intakes(med_id);
CREATE INDEX IF NOT EXISTS idx_intakes_ts ON med_intakes(ts);

INSERT OR IGNORE INTO _schema (version) VALUES (3);
