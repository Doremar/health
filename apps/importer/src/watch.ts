import "dotenv/config";
import chokidar from "chokidar";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { VAULT } from "@health/shared";
import { importFile } from "./pipeline/import.js";
import { logLine } from "./log.js";

const db = new Database(VAULT.db);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

logLine("info", `watcher: starting on ${VAULT.inbox}`);

const queue: string[] = [];
const inQueue = new Set<string>();
let processing = false;
let consecutiveLimitFailures = 0;
let sleepUntil = 0;

function enqueue(filePath: string, source: string): void {
  if (filePath.endsWith(".gitkeep")) return;
  if (inQueue.has(filePath)) return;
  if (!fs.existsSync(filePath)) return;
  inQueue.add(filePath);
  queue.push(filePath);
  logLine("info", `watcher: enqueued ${path.basename(filePath)} (via ${source})`);
  void processQueue();
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    if (Date.now() < sleepUntil) {
      logLine("warn", `watcher: sleeping until ${new Date(sleepUntil).toISOString()}`);
      break;
    }
    const file = queue.shift()!;
    inQueue.delete(file);
    if (!fs.existsSync(file)) continue; // мог удалиться

    try {
      const result = await importFile(db, file);
      logLine("info", `result for ${path.basename(file)}: ${result.status}`);
      consecutiveLimitFailures = 0;
    } catch (e) {
      const msg = (e as Error).message;
      logLine("error", `import error for ${path.basename(file)}: ${msg}`);
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

// Chokidar — основной механизм
chokidar
  .watch(VAULT.inbox, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
    usePolling: true,           // надёжнее для случаев когда mv/cp/перезапись с тем же именем
    interval: 1000,
    binaryInterval: 1500,
  })
  .on("add", (filePath) => enqueue(filePath, "add"))
  .on("change", (filePath) => enqueue(filePath, "change"));

// Страховка: каждые 30 сек сканируем inbox/ напрямую, ловим всё что chokidar пропустил
setInterval(() => {
  try {
    for (const name of fs.readdirSync(VAULT.inbox)) {
      if (name.startsWith(".")) continue;
      enqueue(path.join(VAULT.inbox, name), "rescan");
    }
  } catch (e) {
    logLine("error", `rescan failed: ${(e as Error).message}`);
  }
}, 30_000);

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
