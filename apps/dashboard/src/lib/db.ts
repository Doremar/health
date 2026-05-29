import "server-only";
import Database from "better-sqlite3";
import { VAULT } from "@health/shared";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(VAULT.db, { readonly: false });
  _db.pragma("foreign_keys = ON");
  _db.pragma("journal_mode = WAL");
  return _db;
}
