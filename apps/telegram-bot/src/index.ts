import "dotenv/config";
import { bot } from "./bot.js";
import { rescheduleAll, startFeelingSurveys } from "./scheduler.js";

async function main() {
  console.log("[telegram-bot] starting...");

  // Загружаем расписания приёма лекарств из БД
  rescheduleAll();
  // Запускаем периодические опросы самочувствия
  startFeelingSurveys();

  // Telegraf launch — long polling (без webhook)
  await bot.launch();
  console.log("[telegram-bot] running. Press Ctrl+C to stop.");

  // Корректное завершение
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("[telegram-bot] fatal:", err);
  process.exit(1);
});
