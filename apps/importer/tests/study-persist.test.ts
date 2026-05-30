import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { persistStudy } from "../src/pipeline/study-persist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const f of ["001_init.sql", "007_studies.sql"]) {
    db.exec(fs.readFileSync(path.resolve(__dirname, "../../../migrations/" + f), "utf8"));
  }
  return db;
}

const SAMPLE = {
  date: "2025-11-25",
  type: "ecg" as const,
  modality: "кардиология",
  organ: "сердце",
  facility: "ГКБ",
  doctor: "Иванова",
  conclusion: "Норма",
  findings: null,
  recommendations: null,
  source_file: "originals/studies/2025-11-25-ecg.pdf",
  source_hash: "abc",
  needs_review: 0 as const,
  diagnoses: [{ text: "Синусовый ритм", icd10: null }],
  metrics: [{ code: "hr_avg", name: "ЧСС", value: 72, unit: "уд/мин", ref_low: 60, ref_high: 80, flag: "normal" }],
};

describe("persistStudy", () => {
  let db: Database.Database;
  beforeEach(() => { db = freshDb(); });

  it("inserts study with diagnoses and metrics in one transaction", () => {
    const id = persistStudy(db, SAMPLE);
    expect(id).toBe(1);
    const diag = db.prepare("SELECT COUNT(*) AS n FROM study_diagnoses WHERE study_id = ?").get(id) as { n: number };
    const met = db.prepare("SELECT COUNT(*) AS n FROM study_metrics WHERE study_id = ?").get(id) as { n: number };
    expect(diag.n).toBe(1);
    expect(met.n).toBe(1);
  });

  it("rejects duplicate source_hash", () => {
    persistStudy(db, SAMPLE);
    expect(() => persistStudy(db, SAMPLE)).toThrow();
  });
});
