import type Database from "better-sqlite3";

export interface PersistStudyInput {
  date: string;
  type: string;
  modality: string | null;
  organ: string | null;
  facility: string | null;
  doctor: string | null;
  conclusion: string | null;
  findings: string | null;
  recommendations: string | null;
  source_file: string;
  source_hash: string;
  needs_review: 0 | 1;
  diagnoses: { text: string; icd10: string | null }[];
  metrics: {
    code: string; name: string;
    value: number | null; unit: string | null;
    ref_low: number | null; ref_high: number | null;
    flag: string | null;
  }[];
}

export function persistStudy(db: Database.Database, input: PersistStudyInput): number {
  const insertStudy = db.prepare(`
    INSERT INTO studies (date, type, modality, organ, facility, doctor,
                         conclusion, findings, recommendations,
                         source_file, source_hash, imported_at, needs_review)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDiag = db.prepare(`
    INSERT INTO study_diagnoses (study_id, text, icd10) VALUES (?, ?, ?)
  `);
  const insertMetric = db.prepare(`
    INSERT INTO study_metrics (study_id, code, name, value, unit, ref_low, ref_high, flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((data: PersistStudyInput) => {
    const info = insertStudy.run(
      data.date, data.type, data.modality, data.organ, data.facility, data.doctor,
      data.conclusion, data.findings, data.recommendations,
      data.source_file, data.source_hash, new Date().toISOString(), data.needs_review,
    );
    const studyId = Number(info.lastInsertRowid);
    for (const d of data.diagnoses) insertDiag.run(studyId, d.text, d.icd10);
    for (const m of data.metrics) {
      insertMetric.run(studyId, m.code, m.name, m.value, m.unit, m.ref_low, m.ref_high, m.flag);
    }
    return studyId;
  });

  return tx(input);
}
