#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { runAuthorizationFlow } from "./oauth.js";
import { syncRange } from "./sync.js";
import { getAuth } from "./db.js";

const program = new Command();
program.name("whoop").version("0.0.1").description("Whoop sync CLI");

program.command("auth")
  .description("Подключить Whoop аккаунт (OAuth)")
  .action(async () => {
    try {
      await runAuthorizationFlow();
      console.log("✓ Whoop подключён. Теперь запусти `whoop sync`.");
    } catch (e) {
      console.error("✗ Ошибка OAuth:", (e as Error).message);
      process.exit(1);
    }
  });

program.command("status")
  .description("Показать состояние подключения")
  .action(() => {
    const auth = getAuth();
    if (!auth) {
      console.log("Не подключено. Запусти `whoop auth`.");
      return;
    }
    const exp = new Date(auth.expires_at);
    const valid = exp.getTime() > Date.now();
    console.log(`scope: ${auth.scope ?? "—"}`);
    console.log(`access_token expires_at: ${auth.expires_at} ${valid ? "✓ valid" : "✗ expired"}`);
    console.log(`updated_at: ${auth.updated_at}`);
  });

program.command("sync")
  .description("Забрать последние N дней (default 30)")
  .option("--days <n>", "сколько дней назад тянуть", "30")
  .action(async (opts: { days: string }) => {
    const days = Number(opts.days) || 30;
    try {
      const stats = await syncRange(days);
      console.log("\n✓ Sync done:");
      console.log(`  cycles:   ${stats.cycles}`);
      console.log(`  recovery: ${stats.recovery}`);
      console.log(`  sleeps:   ${stats.sleeps}`);
      console.log(`  workouts: ${stats.workouts}`);
    } catch (e) {
      console.error("✗ Sync failed:", (e as Error).message);
      process.exit(1);
    }
  });

program.parseAsync();
