-- Журнал приёмов пищи
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id            INTEGER PRIMARY KEY,
  ts            TEXT NOT NULL,            -- когда съели (ISO)
  chat_id       INTEGER,                  -- из какого Telegram юзера (опционально)
  description   TEXT,                     -- "омлет с овощами", распознанное название
  image_path    TEXT,                     -- путь к сохранённому фото в vault/health/nutrition/
  calories      REAL,
  protein_g     REAL,
  fat_g         REAL,
  carbs_g       REAL,
  fiber_g       REAL,
  source        TEXT NOT NULL DEFAULT 'telegram_photo',  -- 'telegram_photo' | 'telegram_text' | 'manual'
  confidence    TEXT,                     -- 'high' | 'medium' | 'low'
  notes         TEXT,
  raw_response  TEXT                      -- сырой ответ claude для отладки
);
CREATE INDEX IF NOT EXISTS idx_nutrition_ts ON nutrition_logs(ts);

-- Дневная норма КБЖУ (одна строка)
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  daily_calories  REAL NOT NULL,
  protein_g       REAL NOT NULL,
  fat_g           REAL NOT NULL,
  carbs_g         REAL NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Дефолт (примерная норма для взрослого мужчины 70-80 кг)
INSERT OR IGNORE INTO nutrition_targets (id, daily_calories, protein_g, fat_g, carbs_g, updated_at)
VALUES (1, 2400, 130, 80, 300, datetime('now'));

INSERT OR IGNORE INTO _schema (version) VALUES (5);
