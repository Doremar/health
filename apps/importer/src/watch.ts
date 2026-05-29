import "dotenv/config";
import chokidar from "chokidar";
import Database from "better-sqlite3";
import { VAULT } from "@health/shared";
import { importFile } from "./pipeline/import.js";
import { logLine } from "./log.js";

const db = new Database(VAULT.db);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

logLine("info", `watcher: starting on ${VAULT.inbox}`);

const queue: string[] = [];
let processing = false;
let consecutiveLimitFailures = 0;
let sleepUntil = 0;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    if (Date.now() < sleepUntil) {
      logLine("warn", `watcher: sleeping until ${new Date(sleepUntil).toISOString()}`);
      break;
    }
    const file = queue.shift()!;
    try {
      const result = await importFile(db, file);
      logLine("info", `result for ${file}: ${result.status}`);
      consecutiveLimitFailures = 0;
    } catch (e) {
      const msg = (e as Error).message;
      logLine("error", `import error for ${file}: ${msg}`);
      if (/limit|quota|rate/i.test(msg)) {
        consecutiveLimitFailures++;
        if (consecutiveLimitFailures >= 3) {
          sleepUntil = Date.now() + 6 * 60 * 60 * 1000;
          logLine("warn", `watcher: hit limit 3x, sleeping 6h`);
        } else {
          await new Promise((r) => setTimeout(r, 30 * 60 * 1000));
        }
      }
    }
  }
  processing = false;
}

chokidar
  .watch(VAULT.inbox, { ignoreInitial: false, awaitWriteFinish: { stabilityThreshold: 2000 } })
  .on("add", (filePath) => {
    if (filePath.endsWith(".gitkeep")) return;
    queue.push(filePath);
    void processQueue();
  });

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
