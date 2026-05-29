import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAULT = process.env.HEALTH_VAULT_PATH;
if (!VAULT) throw new Error("HEALTH_VAULT_PATH env var is required");

const dbPath = path.join(VAULT, "db.sqlite");
const migrationsDir = path.resolve(__dirname, "../migrations");

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const current = (() => {
  try {
    return (db.prepare("SELECT MAX(version) AS v FROM _schema").get() as { v: number | null }).v ?? 0;
  } catch {
    return 0;
  }
})();

const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const f of files) {
  const versionMatch = f.match(/^(\d{3})_/);
  if (!versionMatch) continue;
  const version = parseInt(versionMatch[1]!, 10);
  if (version <= current) {
    console.log(`skip ${f} (already at ${current})`);
    continue;
  }
  const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
  console.log(`apply ${f}`);
  db.exec(sql);
}

console.log(`Migrated. DB: ${dbPath}`);
db.close();
