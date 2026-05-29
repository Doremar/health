import type Database from "better-sqlite3";
import type { Flag } from "@health/shared";

export interface PersistMarker {
  code: string;
  name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: Flag;
}

export interface PersistInput {
  date: string;
  lab_name: string;
  panel: string | null;
  source_file: string;
  source_hash: string;
  needs_review: 0 | 1;
  markers: PersistMarker[];
}

export function persistLab(db: Database.Database, input: PersistInput): number {
  const insertLab = db.prepare(`
    INSERT INTO labs (date, lab_name, panel, source_file, source_hash, imported_at, needs_review)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMarker = db.prepare(`
    INSERT INTO markers (lab_id, code, name, value, value_text, unit, ref_low, ref_high, ref_text, flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((data: PersistInput) => {
    const info = insertLab.run(
      data.date, data.lab_name, data.panel, data.source_file,
      data.source_hash, new Date().toISOString(), data.needs_review,
    );
    const labId = Number(info.lastInsertRowid);
    for (const m of data.markers) {
      insertMarker.run(
        labId, m.code, m.name, m.value, m.value_text, m.unit,
        m.ref_low, m.ref_high, m.ref_text, m.flag,
      );
    }
    return labId;
  });

  return tx(input);
}
