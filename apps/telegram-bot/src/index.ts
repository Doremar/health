import "dotenv/config";
import { bot } from "./bot.js";
import { rescheduleAll, startFeelingSurveys } from "./scheduler.js";

async function launchWithRetry(maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.launch();
      return;
    } catch (err: any) {
      const code = err?.response?.error_code;
      const desc = err?.response?.description ?? err?.message ?? String(err);
      if (code === 409) {
        const delay = Math.min(5_000 * attempt, 30_000);
        console.warn(
          `[telegram-bot] 409 conflict (другой инстанс?), retry в ${delay / 1000}s (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Bot launch failed after ${maxRetries} retries`);
}

async function main() {
  console.log("[telegram-bot] starting...");

  rescheduleAll();
  startFeelingSurveys();

  await launchWithRetry();
  console.log("[telegram-bot] running. Press Ctrl+C to stop.");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("[telegram-bot] fatal:", err);
  process.exit(1);
});
