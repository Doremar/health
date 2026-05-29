CREATE TABLE IF NOT EXISTS labs (
  id           INTEGER PRIMARY KEY,
  date         TEXT NOT NULL,
  lab_name     TEXT NOT NULL,
  panel        TEXT,
  source_file  TEXT NOT NULL,
  source_hash  TEXT NOT NULL UNIQUE,
  imported_at  TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS markers (
  id         INTEGER PRIMARY KEY,
  lab_id     INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  value      REAL,
  value_text TEXT,
  unit       TEXT,
  ref_low    REAL,
  ref_high   REAL,
  ref_text   TEXT,
  flag       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marker_aliases (
  alias          TEXT PRIMARY KEY,
  canonical_code TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_markers_code ON markers(code);
CREATE INDEX IF NOT EXISTS idx_markers_lab  ON markers(lab_id);
CREATE INDEX IF NOT EXISTS idx_labs_date    ON labs(date);

CREATE TABLE IF NOT EXISTS _schema (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO _schema (version) VALUES (1);
