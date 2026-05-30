import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { message } from "telegraf/filters";
import { parseScheduleToCron } from "@health/shared";
import {
  upsertUser, listActiveMeds, addMedication, deactivateMed,
  getMed, logIntake, logFeeling, listUsers,
  getTarget, setTarget, getTodayTotal, listTodayMeals, deleteNutritionLog,
} from "./db.js";
import { processFoodPhoto } from "./nutrition.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN env var is required");
}

export const bot = new Telegraf(TOKEN);

// ============= /start =============
bot.start(async (ctx) => {
  const user = upsertUser({
    chat_id: ctx.chat.id,
    username: ctx.from?.username,
    first_name: ctx.from?.first_name,
  });

  await ctx.reply(
    `Привет${user.first_name ? ", " + user.first_name : ""}! Я твой health-помощник.\n\n` +
    `Что я умею:\n` +
    `• 🩺 /feeling — записать самочувствие сейчас\n` +
    `• 💊 /meds — список твоих лекарств\n` +
    `• ➕ /addmed — добавить лекарство и расписание\n` +
    `• 🛑 /stopmed — снять с приёма\n` +
    `• ℹ️ /help — все команды\n\n` +
    `Также буду периодически писать сам — спрашивать как ты и напоминать о приёме лекарств.`
  );
});

// ============= /help =============
bot.help(async (ctx) => {
  await ctx.reply(
    `Команды:\n\n` +
    `🩺 Самочувствие\n` +
    `/feeling — записать настроение и энергию\n\n` +
    `💊 Лекарства\n` +
    `/meds — список\n` +
    `/addmed Название | доза | расписание (пример: Витамин D | 5000 МЕ | утром)\n` +
    `/stopmed N — снять #N с приёма\n\n` +
    `🍳 Питание\n` +
    `📸 Просто пришли фото еды — посчитаю КБЖУ\n` +
    `/today — итог за сегодня\n` +
    `/target — посмотреть/изменить дневную норму\n\n` +
    `⚙️ Прочее\n` +
    `/whoami — мой chat_id`
  );
});

// ============= /whoami =============
bot.command("whoami", async (ctx) => {
  await ctx.reply(`chat_id: \`${ctx.chat.id}\`\nusername: ${ctx.from?.username ?? "—"}`,
    { parse_mode: "Markdown" });
});

// ============= /feeling =============
bot.command("feeling", async (ctx) => {
  upsertUser({ chat_id: ctx.chat.id, username: ctx.from?.username, first_name: ctx.from?.first_name });
  await askMood(ctx);
});

async function askMood(ctx: Context) {
  await ctx.reply(
    "Как настроение?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("😢 1", "mood:1"),
        Markup.button.callback("😕 2", "mood:2"),
        Markup.button.callback("😐 3", "mood:3"),
        Markup.button.callback("🙂 4", "mood:4"),
        Markup.button.callback("😄 5", "mood:5"),
      ],
    ])
  );
}

// Состояние «незавершённого опроса» (mood выбрали, ждём energy)
const pendingFeeling = new Map<number, { mood: number }>();

bot.action(/^mood:([1-5])$/, async (ctx) => {
  const mood = Number(ctx.match[1]);
  pendingFeeling.set(ctx.chat!.id, { mood });
  await ctx.answerCbQuery(`Настроение: ${mood}`);
  await ctx.editMessageText(`Настроение: ${mood}/5 ✓`);
  await ctx.reply(
    "Энергия?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("😵 1", "energy:1"),
        Markup.button.callback("😴 2", "energy:2"),
        Markup.button.callback("😐 3", "energy:3"),
        Markup.button.callback("⚡ 4", "energy:4"),
        Markup.button.callback("🔥 5", "energy:5"),
      ],
    ])
  );
});

bot.action(/^energy:([1-5])$/, async (ctx) => {
  const energy = Number(ctx.match[1]);
  const chatId = ctx.chat!.id;
  const state = pendingFeeling.get(chatId);
  if (!state) {
    await ctx.answerCbQuery("Опрос потерял контекст, начни /feeling заново");
    return;
  }
  const id = logFeeling({
    chat_id: chatId,
    mood: state.mood,
    energy,
  });
  pendingFeeling.delete(chatId);
  await ctx.answerCbQuery(`Энергия: ${energy}`);
  await ctx.editMessageText(`Энергия: ${energy}/5 ✓`);
  await ctx.reply(
    `Записал. Если хочешь добавить заметку — просто напиши следующим сообщением:\n` +
    `"к записи ${id}: что хочется"`
  );
});

// Свободный текст: если начинается с "к записи N: ..." — добавляем заметку
bot.on("text", async (ctx, next) => {
  const text = ctx.message.text;
  const m = text.match(/^к записи (\d+)\s*:\s*(.+)$/i);
  if (m) {
    const id = Number(m[1]);
    const note = m[2];
    const { db } = await import("./db.js");
    db().prepare("UPDATE feeling_logs SET notes = ? WHERE id = ?").run(note, id);
    await ctx.reply(`Заметка добавлена к записи #${id}.`);
    return;
  }
  if (next) await next();
});

// ============= /meds =============
bot.command("meds", async (ctx) => {
  const meds = listActiveMeds();
  if (meds.length === 0) {
    await ctx.reply("Лекарств пока нет. Добавь через /addmed.");
    return;
  }
  const lines = meds.map((m) =>
    `*${m.id}.* ${m.name}` +
    (m.dose ? ` · ${m.dose}` : "") +
    (m.schedule_hint ? `\n   ⏰ ${m.schedule_hint}` : "")
  );
  await ctx.reply(`Активные лекарства:\n\n${lines.join("\n\n")}`, { parse_mode: "Markdown" });
});

// ============= /addmed =============
// /addmed Витамин D | 5000 МЕ | 09:00
// /addmed Магний | | вечером
// /addmed Аспирин | 100 мг | 8 и 20
bot.command("addmed", async (ctx) => {
  upsertUser({ chat_id: ctx.chat.id, username: ctx.from?.username, first_name: ctx.from?.first_name });
  const args = ctx.message.text.replace(/^\/addmed(@\w+)?\s*/, "").trim();
  if (!args) {
    await ctx.reply(
      "Формат: `/addmed Название | доза | расписание`\n" +
      "Пример: `/addmed Витамин D | 5000 МЕ | 09:00`\n" +
      "Поддерживаются: HH:MM, HH:MM,HH:MM (несколько раз), 'утром', 'вечером', 'утром и вечером', 'каждые N часов'",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const parts = args.split("|").map((s) => s.trim());
  const name = parts[0];
  const dose = parts[1] || undefined;
  const scheduleText = parts[2] || undefined;

  if (!name) {
    await ctx.reply("Название обязательно.");
    return;
  }

  const cron = scheduleText ? parseScheduleToCron(scheduleText) : null;
  const id = addMedication({
    name,
    dose,
    schedule_cron: cron ?? undefined,
    schedule_hint: scheduleText,
  });

  await ctx.reply(
    `Добавлено #${id}: ${name}` +
    (dose ? ` · ${dose}` : "") +
    (scheduleText ? `\n⏰ ${scheduleText}` : "") +
    (cron ? `\n(cron: \`${cron}\`)` : scheduleText ? `\n⚠ Не смог разобрать расписание — напоминания не будут идти. Используй HH:MM формат.` : ""),
    { parse_mode: "Markdown" }
  );

  // Перезапускаем планировщик
  const { rescheduleAll } = await import("./scheduler.js");
  rescheduleAll();
});

// ============= /stopmed N =============
bot.command("stopmed", async (ctx) => {
  const args = ctx.message.text.replace(/^\/stopmed(@\w+)?\s*/, "").trim();
  const id = Number(args);
  if (!id) {
    await ctx.reply("Формат: `/stopmed 3`", { parse_mode: "Markdown" });
    return;
  }
  const med = getMed(id);
  if (!med) {
    await ctx.reply(`Лекарство #${id} не найдено.`);
    return;
  }
  deactivateMed(id);
  await ctx.reply(`Снято: ${med.name}`);

  const { rescheduleAll } = await import("./scheduler.js");
  rescheduleAll();
});

// ============= Inline-кнопки приёма =============
// "✓ Принял" / "Пропустил" / "Через 30 мин"
bot.action(/^took:(\d+)$/, async (ctx) => {
  const medId = Number(ctx.match[1]);
  const med = getMed(medId);
  if (!med) {
    await ctx.answerCbQuery("Не найдено");
    return;
  }
  logIntake({ med_id: medId, status: "taken" });
  await ctx.answerCbQuery(`Записано: принято`);
  await ctx.editMessageText(`💊 ${med.name}${med.dose ? " · " + med.dose : ""} ✓ принято`);
});

bot.action(/^skip:(\d+)$/, async (ctx) => {
  const medId = Number(ctx.match[1]);
  const med = getMed(medId);
  if (!med) {
    await ctx.answerCbQuery("Не найдено");
    return;
  }
  logIntake({ med_id: medId, status: "skipped" });
  await ctx.answerCbQuery(`Пропуск записан`);
  await ctx.editMessageText(`💊 ${med.name}${med.dose ? " · " + med.dose : ""} — пропущено`);
});

bot.action(/^snooze:(\d+)$/, async (ctx) => {
  const medId = Number(ctx.match[1]);
  const med = getMed(medId);
  if (!med) {
    await ctx.answerCbQuery("Не найдено");
    return;
  }
  logIntake({ med_id: medId, status: "snooze" });
  await ctx.answerCbQuery(`Напомню через 30 мин`);
  await ctx.editMessageText(`💊 ${med.name} — отложено на 30 мин`);

  // Через 30 минут — напомнить снова
  setTimeout(() => {
    void sendMedReminder(ctx.chat!.id, medId);
  }, 30 * 60 * 1000);
});

// ============= Helper: послать напоминание =============
export async function sendMedReminder(chatId: number, medId: number) {
  const med = getMed(medId);
  if (!med || med.active !== 1) return;
  try {
    await bot.telegram.sendMessage(
      chatId,
      `💊 Пора принять: *${med.name}*${med.dose ? `\nДоза: ${med.dose}` : ""}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✓ Принял", `took:${medId}`),
            Markup.button.callback("⊘ Пропуск", `skip:${medId}`),
            Markup.button.callback("⏰ +30мин", `snooze:${medId}`),
          ],
        ]),
      }
    );
  } catch (e) {
    console.error("sendMedReminder failed:", (e as Error).message);
  }
}

// ============= Helper: послать опрос самочувствия =============
export async function sendFeelingPrompt(chatId: number) {
  try {
    await bot.telegram.sendMessage(
      chatId,
      "🩺 Как ты сейчас? Жми /feeling или нажми кнопку.",
      Markup.inlineKeyboard([[Markup.button.callback("Записать самочувствие", "open_feeling")]])
    );
  } catch (e) {
    console.error("sendFeelingPrompt failed:", (e as Error).message);
  }
}

bot.action("open_feeling", async (ctx) => {
  await ctx.answerCbQuery();
  await askMood(ctx);
});

// ============= Nutrition: фото еды =============

function fmtKbju(parsed: { calories: number | null; protein_g: number | null; fat_g: number | null; carbs_g: number | null }): string {
  const num = (v: number | null, unit = "") => v === null ? "—" : `${Math.round(v)}${unit}`;
  return `🔥 ${num(parsed.calories)} ккал\n💪 Б ${num(parsed.protein_g, "г")} · 🥑 Ж ${num(parsed.fat_g, "г")} · 🍞 У ${num(parsed.carbs_g, "г")}`;
}

bot.on(message("photo"), async (ctx) => {
  upsertUser({ chat_id: ctx.chat.id, username: ctx.from?.username, first_name: ctx.from?.first_name });
  const photos = ctx.message.photo;
  if (!photos || photos.length === 0) return;
  // Самый большой размер — последний
  const fileId = photos[photos.length - 1]!.file_id;
  const caption = "caption" in ctx.message && typeof ctx.message.caption === "string" ? ctx.message.caption : undefined;

  const ack = await ctx.reply("🔍 Распознаю еду... 30-60 сек");

  try {
    const result = await processFoodPhoto(bot, fileId, ctx.chat.id, caption);
    if ("error" in result) {
      await ctx.telegram.editMessageText(ctx.chat.id, ack.message_id, undefined, `⚠️ ${result.error}`);
      return;
    }
    const { logId, parsed } = result;
    const conf = parsed.confidence === "high" ? "✓" : parsed.confidence === "medium" ? "~" : "?";
    const msg =
      `${conf} *${parsed.description}*\n\n` +
      fmtKbju(parsed) +
      `\n\n#${logId} · уверенность: ${parsed.confidence}`;
    await ctx.telegram.editMessageText(ctx.chat.id, ack.message_id, undefined, msg, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✓ Принять", `food_keep:${logId}`),
          Markup.button.callback("🗑 Удалить", `food_drop:${logId}`),
        ],
      ]),
    });
  } catch (e) {
    await ctx.telegram.editMessageText(ctx.chat.id, ack.message_id, undefined, `⚠️ Ошибка: ${(e as Error).message}`);
  }
});

bot.action(/^food_keep:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery("Записано");
  // Просто убираем кнопки, текст оставляем
  try {
    await ctx.editMessageReplyMarkup(undefined);
  } catch { /* ignore */ }
});

// Первый клик — показать confirm
bot.action(/^food_drop:(\d+)$/, async (ctx) => {
  const logId = Number(ctx.match[1]);
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          Markup.button.callback("⚠ Точно удалить?", "noop"),
        ],
        [
          Markup.button.callback("Да, удалить", `food_drop_yes:${logId}`),
          Markup.button.callback("Отмена", `food_drop_no:${logId}`),
        ],
      ],
    });
  } catch { /* ignore */ }
});

bot.action(/^food_drop_yes:(\d+)$/, async (ctx) => {
  const logId = Number(ctx.match[1]);
  deleteNutritionLog(logId);
  await ctx.answerCbQuery("Удалено");
  try {
    await ctx.editMessageText(`🗑 Запись #${logId} удалена.`);
  } catch { /* ignore */ }
});

bot.action(/^food_drop_no:(\d+)$/, async (ctx) => {
  const logId = Number(ctx.match[1]);
  await ctx.answerCbQuery("Отменено");
  // Вернуть исходные кнопки
  try {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [[
        Markup.button.callback("✓ Принять", `food_keep:${logId}`),
        Markup.button.callback("🗑 Удалить", `food_drop:${logId}`),
      ]],
    });
  } catch { /* ignore */ }
});

bot.action("noop", async (ctx) => { await ctx.answerCbQuery(); });

// ============= /today =============

bot.command("today", async (ctx) => {
  const total = getTodayTotal();
  const target = getTarget();
  const meals = listTodayMeals();

  if (meals.length === 0) {
    await ctx.reply("За сегодня записей нет. Пришли фото еды чтобы начать.");
    return;
  }

  function pct(actual: number, goal: number): string {
    const p = Math.round((actual / goal) * 100);
    return `${p}%`;
  }

  function bar(actual: number, goal: number, width = 12): string {
    const filled = Math.min(width, Math.round((actual / goal) * width));
    return "█".repeat(filled) + "░".repeat(width - filled);
  }

  const lines = [
    "📊 *Сегодня*",
    "",
    `🔥 *${Math.round(total.calories)}* / ${target.daily_calories} ккал · ${pct(total.calories, target.daily_calories)}`,
    `${bar(total.calories, target.daily_calories)}`,
    "",
    `💪 Белки: *${Math.round(total.protein_g)}* / ${target.protein_g} г · ${pct(total.protein_g, target.protein_g)}`,
    `🥑 Жиры: *${Math.round(total.fat_g)}* / ${target.fat_g} г · ${pct(total.fat_g, target.fat_g)}`,
    `🍞 Угл.: *${Math.round(total.carbs_g)}* / ${target.carbs_g} г · ${pct(total.carbs_g, target.carbs_g)}`,
    "",
    `*Приёмы пищи (${meals.length}):*`,
  ];

  for (const m of meals) {
    const t = new Date(m.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const kcal = m.calories ? `${Math.round(m.calories)} ккал` : "—";
    lines.push(`${t} — ${m.description ?? "?"} · ${kcal}`);
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
});

// ============= /target =============

bot.command("target", async (ctx) => {
  const args = ctx.message.text.replace(/^\/target(@\w+)?\s*/, "").trim();
  if (!args) {
    const t = getTarget();
    await ctx.reply(
      `Дневная норма КБЖУ:\n\n` +
      `🔥 ${t.daily_calories} ккал\n` +
      `💪 Б ${t.protein_g} г\n` +
      `🥑 Ж ${t.fat_g} г\n` +
      `🍞 У ${t.carbs_g} г\n\n` +
      `Изменить: \`/target 2400 130 80 300\` (ккал Б Ж У)`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const parts = args.split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n <= 0)) {
    await ctx.reply("Формат: `/target ккал Б Ж У`\nПример: `/target 2400 130 80 300`", { parse_mode: "Markdown" });
    return;
  }
  const [daily_calories, protein_g, fat_g, carbs_g] = parts as [number, number, number, number];
  setTarget({ daily_calories, protein_g, fat_g, carbs_g });
  await ctx.reply(`✓ Норма обновлена: ${daily_calories} ккал · Б${protein_g}/Ж${fat_g}/У${carbs_g}`);
});

// ============= Помощь по неизвестным =============
bot.on("text", async (ctx) => {
  // Сюда падают сообщения которые не зацепил matcher выше
  await ctx.reply("Не понял команду. /help для списка.");
});

export function getListedUsers() {
  return listUsers();
}
