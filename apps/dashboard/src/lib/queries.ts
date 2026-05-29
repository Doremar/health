import "server-only";
import { db } from "./db";
import type { Flag } from "@health/shared";

export interface MarkerSummary {
  code: string;
  name: string;
  last_value: number | null;
  last_value_text: string | null;
  unit: string | null;
  last_date: string;
  last_flag: Flag;
  ref_low: number | null;
  ref_high: number | null;
  last_panel: string | null;
  last_lab_name: string;
}

export function listMarkerSummaries(): MarkerSummary[] {
  return db().prepare(`
    SELECT m.code, m.name, m.value AS last_value, m.value_text AS last_value_text,
           m.unit, l.date AS last_date, m.flag AS last_flag,
           m.ref_low, m.ref_high,
           l.panel AS last_panel, l.lab_name AS last_lab_name
    FROM markers m
    JOIN labs l ON l.id = m.lab_id
    JOIN (
      SELECT m2.code, MAX(l2.date) AS max_date
      FROM markers m2 JOIN labs l2 ON l2.id = m2.lab_id
      GROUP BY m2.code
    ) latest ON latest.code = m.code AND latest.max_date = l.date
    ORDER BY (m.flag != 'normal') DESC, m.code
  `).all() as MarkerSummary[];
}

export interface MarkerHistoryPoint {
  date: string;
  value: number | null;
  unit: string | null;
  flag: Flag;
  lab_id: number;
  lab_name: string;
}

export function listMarkerHistory(code: string): MarkerHistoryPoint[] {
  return db().prepare(`
    SELECT l.date, m.value, m.unit, m.flag, l.id AS lab_id, l.lab_name
    FROM markers m JOIN labs l ON l.id = m.lab_id
    WHERE m.code = ?
    ORDER BY l.date
  `).all(code) as MarkerHistoryPoint[];
}

export function getMarkerMeta(code: string): { name: string; ref_low: number | null; ref_high: number | null; unit: string | null; panel: string | null } | null {
  return db().prepare(`
    SELECT m.name, m.ref_low, m.ref_high, m.unit, l.panel
    FROM markers m JOIN labs l ON l.id = m.lab_id
    WHERE m.code = ? ORDER BY m.id DESC LIMIT 1
  `).get(code) as any ?? null;
}

export interface LabHeader {
  id: number; date: string; lab_name: string; panel: string | null;
  source_file: string; needs_review: 0 | 1;
}

export function getLab(id: number): LabHeader | null {
  return db().prepare("SELECT id, date, lab_name, panel, source_file, needs_review FROM labs WHERE id = ?").get(id) as LabHeader | null;
}

export function listLabMarkers(labId: number) {
  return db().prepare(`
    SELECT code, name, value, value_text, unit, ref_low, ref_high, ref_text, flag
    FROM markers WHERE lab_id = ? ORDER BY id
  `).all(labId);
}

export function listAllLabs(): LabHeader[] {
  return db().prepare("SELECT id, date, lab_name, panel, source_file, needs_review FROM labs ORDER BY date DESC").all() as LabHeader[];
}

export function deleteLab(id: number): void {
  db().prepare("DELETE FROM labs WHERE id = ?").run(id);
}
