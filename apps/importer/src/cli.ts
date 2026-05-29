#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { VAULT } from "@health/shared";
import { importFile } from "./pipeline/import.js";
import { regenerateAllMarkdown } from "./pipeline/markdown.js";
import { resolveCanonicalCode, slugify } from "./pipeline/normalize.js";

function openDb(): Database.Database {
  const db = new Database(VAULT.db);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  return db;
}

const program = new Command();
program.name("health").version("0.0.1");

program.command("import <file>")
  .description("Импортировать один файл")
  .action(async (file: string) => {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.error(`not found: ${abs}`); process.exit(1); }
    const db = openDb();
    const result = await importFile(db, abs);
    console.log(JSON.stringify(result, null, 2));
    db.close();
  });

program.command("regenerate-md")
  .description("Пересоздать все .md из БД")
  .action(async () => {
    const db = openDb();
    const n = await regenerateAllMarkdown(db);
    console.log(`regenerated ${n} files`);
    db.close();
  });

program.command("quarantine-list")
  .description("Показать содержимое quarantine/")
  .action(() => {
    const files = fs.readdirSync(VAULT.quarantine).filter((f) => !f.startsWith("."));
    for (const f of files) console.log(f);
  });

program.command("reimport <file>")
  .description("Удалить запись по хешу и импортировать заново")
  .action(async (file: string) => {
    const abs = path.resolve(file);
    const { fileHash } = await import("./pipeline/hash.js");
    const hash = await fileHash(abs);
    const db = openDb();
    db.prepare("DELETE FROM labs WHERE source_hash = ?").run(hash);
    const result = await importFile(db, abs);
    console.log(JSON.stringify(result, null, 2));
    db.close();
  });

program.command("rebuild-aliases")
  .description("Пересмотреть все маркеры и пересоздать таблицу алиасов")
  .action(() => {
    const db = openDb();
    const rows = db.prepare("SELECT DISTINCT name FROM markers").all() as { name: string }[];
    db.exec("DELETE FROM marker_aliases");
    for (const r of rows) {
      const code = slugify(r.name);
      db.prepare("INSERT OR REPLACE INTO marker_aliases (alias, canonical_code) VALUES (?, ?)")
        .run(r.name, code);
      db.prepare("UPDATE markers SET code = ? WHERE name = ?").run(code, r.name);
    }
    console.log(`rebuilt ${rows.length} aliases`);
    db.close();
  });

program.parseAsync();
