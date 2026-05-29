import fs from "node:fs";
import { VAULT } from "@health/shared";

export type LogLevel = "info" | "warn" | "error";

export function logLine(level: LogLevel, msg: string): void {
  const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
  fs.appendFileSync(VAULT.importLog, line);
  if (level === "error") process.stderr.write(line);
  else process.stdout.write(line);
}
