import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { persistLab } from "../src/pipeline/persist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(
    path.resolve(__dirname, "../../../migrations/001_init.sql"),
    "utf8",
  );
  db.exec(schema);
  return db;
}

describe("persistLab", () => {
  let db: Database.Database;
  beforeEach(() => { db = freshDb(); });

  it("inserts lab + markers in one transaction", () => {
    const labId = persistLab(db, {
      date: "2026-03-15",
      lab_name: "Invitro",
      panel: "биохимия",
      source_file: "originals/x.pdf",
      source_hash: "abc123",
      needs_review: 0,
      markers: [
        { code: "ferritin", name: "Ферритин", value: 45, value_text: null,
          unit: "ng/ml", ref_low: 30, ref_high: 400, ref_text: null, flag: "normal" },
        { code: "vitamin_d_25oh", name: "Витамин D", value: 18, value_text: null,
          unit: "ng/ml", ref_low: 30, ref_high: 100, ref_text: null, flag: "low" },
      ],
    });
    expect(labId).toBe(1);
    const markers = db.prepare("SELECT code FROM markers WHERE lab_id = ?").all(labId);
    expect(markers).toHaveLength(2);
  });

  it("throws on duplicate source_hash", () => {
    const payload = {
      date: "2026-03-15",
      lab_name: "Invitro",
      panel: null,
      source_file: "originals/x.pdf",
      source_hash: "dup",
      needs_review: 0 as const,
      markers: [],
    };
    persistLab(db, payload);
    expect(() => persistLab(db, payload)).toThrow();
  });
});
