export type Flag = "normal" | "low" | "high" | "critical";

export interface LabRow {
  id: number;
  date: string;
  lab_name: string;
  panel: string | null;
  source_file: string;
  source_hash: string;
  imported_at: string;
  needs_review: 0 | 1;
  notes: string | null;
}

export interface MarkerRow {
  id: number;
  lab_id: number;
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
