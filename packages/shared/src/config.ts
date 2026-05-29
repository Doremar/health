import path from "node:path";
import fs from "node:fs";

const HEALTH_VAULT_PATH = process.env.HEALTH_VAULT_PATH;
if (!HEALTH_VAULT_PATH) {
  throw new Error("HEALTH_VAULT_PATH env var is required");
}
if (!fs.existsSync(HEALTH_VAULT_PATH)) {
  throw new Error(`HEALTH_VAULT_PATH does not exist: ${HEALTH_VAULT_PATH}`);
}

export const VAULT = {
  root: HEALTH_VAULT_PATH,
  inbox: path.join(HEALTH_VAULT_PATH, "inbox"),
  originals: path.join(HEALTH_VAULT_PATH, "originals"),
  labs: path.join(HEALTH_VAULT_PATH, "labs"),
  quarantine: path.join(HEALTH_VAULT_PATH, "quarantine"),
  db: path.join(HEALTH_VAULT_PATH, "db.sqlite"),
  importLog: path.join(HEALTH_VAULT_PATH, ".import.log"),
} as const;

export const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
