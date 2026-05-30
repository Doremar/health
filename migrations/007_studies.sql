CREATE TABLE IF NOT EXISTS studies (
  id              INTEGER PRIMARY KEY,
  date            TEXT NOT NULL,
  type            TEXT NOT NULL,
  modality        TEXT,
  organ           TEXT,
  facility        TEXT,
  doctor          TEXT,
  conclusion      TEXT,
  findings        TEXT,
  recommendations TEXT,
  source_file     TEXT NOT NULL,
  source_hash     TEXT NOT NULL UNIQUE,
  imported_at     TEXT NOT NULL,
  needs_review    INTEGER NOT NULL DEFAULT 0,
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_studies_date ON studies(date);
CREATE INDEX IF NOT EXISTS idx_studies_type ON studies(type);
CREATE INDEX IF NOT EXISTS idx_studies_modality ON studies(modality);

CREATE TABLE IF NOT EXISTS study_diagnoses (
  id        INTEGER PRIMARY KEY,
  study_id  INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  text      TEXT NOT NULL,
  icd10     TEXT
);
CREATE INDEX IF NOT EXISTS idx_diag_study ON study_diagnoses(study_id);

CREATE TABLE IF NOT EXISTS study_metrics (
  id        INTEGER PRIMARY KEY,
  study_id  INTEGER NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  code      TEXT NOT NULL,
  name      TEXT NOT NULL,
  value     REAL,
  unit      TEXT,
  ref_low   REAL,
  ref_high  REAL,
  flag      TEXT
);
CREATE INDEX IF NOT EXISTS idx_smetric_study ON study_metrics(study_id);
CREATE INDEX IF NOT EXISTS idx_smetric_code ON study_metrics(code);

INSERT OR IGNORE INTO _schema (version) VALUES (7);
