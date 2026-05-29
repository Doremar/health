import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TMP_VAULT = path.join(os.tmpdir(), `health-test-${Date.now()}`);
process.env.HEALTH_VAULT_PATH = TMP_VAULT;

// Создаём структуру vault до импорта модулей, которые читают env
function setupVault() {
  fs.mkdirSync(TMP_VAULT, { recursive: true });
  for (const d of ["inbox", "originals", "labs", "quarantine"]) {
    fs.mkdirSync(path.join(TMP_VAULT, d), { recursive: true });
  }
}
setupVault();

const { importFile } = await import("../src/pipeline/import.js");

function freshDb(): Database.Database {
  const dbPath = path.join(TMP_VAULT, "db.sqlite");
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(
    path.resolve(__dirname, "../../../migrations/001_init.sql"), "utf8",
  );
  db.exec(schema);
  return db;
}

describe("importFile", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
    for (const d of ["inbox", "originals", "labs", "quarantine"]) {
      const p = path.join(TMP_VAULT, d);
      for (const f of fs.readdirSync(p)) fs.unlinkSync(path.join(p, f));
    }
  });
  afterEach(() => db.close());

  it("happy path: file → DB + markdown + originals", async () => {
    const inbox = path.join(TMP_VAULT, "inbox", "test.pdf");
    fs.writeFileSync(inbox, "fake pdf content");
    const claudeRunner = vi.fn().mockResolvedValue(JSON.stringify({
      date: "2026-03-15", lab_name: "Invitro", panel: "биохимия",
      markers: [{ name: "Ферритин", value: 45, value_text: null,
        unit: "ng/ml", ref_low: 30, ref_high: 400, ref_text: null }],
      is_lab_result: true, confidence: "high",
    }));

    const result = await importFile(db, inbox, { claudeRunner });
    expect(result.status).toBe("imported");

    expect(fs.existsSync(inbox)).toBe(false);
    const originals = fs.readdirSync(path.join(TMP_VAULT, "originals"));
    expect(originals).toHaveLength(1);
    const labs = fs.readdirSync(path.join(TMP_VAULT, "labs"));
    expect(labs).toHaveLength(1);
    const labRow = db.prepare("SELECT * FROM labs").get() as { lab_name: string };
    expect(labRow.lab_name).toBe("Invitro");
  });

  it("duplicate by hash → skip", async () => {
    const inbox = path.join(TMP_VAULT, "inbox", "test.pdf");
    fs.writeFileSync(inbox, "fake pdf content");
    const claudeRunner = vi.fn().mockResolvedValue(JSON.stringify({
      date: "2026-03-15", lab_name: "Invitro", panel: null,
      markers: [], is_lab_result: true, confidence: "high",
    }));
    await importFile(db, inbox, { claudeRunner });

    const inbox2 = path.join(TMP_VAULT, "inbox", "test2.pdf");
    fs.writeFileSync(inbox2, "fake pdf content");
    const result = await importFile(db, inbox2, { claudeRunner });
    expect(result.status).toBe("duplicate");
    expect(claudeRunner).toHaveBeenCalledTimes(1);
  });

  it("not a lab result → quarantine", async () => {
    const inbox = path.join(TMP_VAULT, "inbox", "receipt.pdf");
    fs.writeFileSync(inbox, "shop receipt");
    const claudeRunner = vi.fn().mockResolvedValue(JSON.stringify({
      date: "2026-03-15", lab_name: "n/a", panel: null,
      markers: [], is_lab_result: false, confidence: "high",
    }));
    const result = await importFile(db, inbox, { claudeRunner });
    expect(result.status).toBe("quarantined");
    const q = fs.readdirSync(path.join(TMP_VAULT, "quarantine"));
    expect(q).toHaveLength(1);
  });

  it("3 bad JSON responses → quarantine", async () => {
    const inbox = path.join(TMP_VAULT, "inbox", "test.pdf");
    fs.writeFileSync(inbox, "fake pdf content");
    const claudeRunner = vi.fn().mockResolvedValue("garbage");
    const result = await importFile(db, inbox, { claudeRunner });
    expect(result.status).toBe("quarantined");
    expect(claudeRunner).toHaveBeenCalledTimes(3);
  });
});
