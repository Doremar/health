import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { resolveCanonicalCode, slugify } from "../src/pipeline/normalize.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE marker_aliases (
      alias TEXT PRIMARY KEY,
      canonical_code TEXT NOT NULL
    );
  `);
  return db;
}

describe("slugify", () => {
  it("transliterates Russian", () => {
    expect(slugify("Ферритин")).toBe("ferritin");
    expect(slugify("Витамин D")).toBe("vitamin_d");
    expect(slugify("25-OH Витамин D")).toBe("25_oh_vitamin_d");
  });

  it("handles English", () => {
    expect(slugify("Ferritin")).toBe("ferritin");
    expect(slugify("FER")).toBe("fer");
  });
});

describe("resolveCanonicalCode", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns existing alias mapping", () => {
    db.prepare("INSERT INTO marker_aliases (alias, canonical_code) VALUES (?, ?)")
      .run("Ферритин", "ferritin");
    expect(resolveCanonicalCode(db, "Ферритин")).toBe("ferritin");
  });

  it("creates new alias when unknown", () => {
    expect(resolveCanonicalCode(db, "Новый Маркер")).toBe("noviy_marker");
    const row = db.prepare("SELECT canonical_code FROM marker_aliases WHERE alias = ?")
      .get("Новый Маркер") as { canonical_code: string };
    expect(row.canonical_code).toBe("noviy_marker");
  });

  it("is case-insensitive on alias lookup", () => {
    db.prepare("INSERT INTO marker_aliases (alias, canonical_code) VALUES (?, ?)")
      .run("Ферритин", "ferritin");
    expect(resolveCanonicalCode(db, "ферритин")).toBe("ferritin");
    expect(resolveCanonicalCode(db, "ФЕРРИТИН")).toBe("ferritin");
  });
});
