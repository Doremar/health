import cron from "node-cron";
import { listActiveMeds, getPrimaryChatId, listUsers } from "./db.js";
import { sendMedReminder, sendFeelingPrompt } from "./bot.js";

interface ScheduledJob {
  task: cron.ScheduledTask;
  medId: number;
  cronExpr: string;
}

const medJobs: ScheduledJob[] = [];
let feelingJobs: cron.ScheduledTask[] = [];

function clearAllMedJobs(): void {
  for (const j of medJobs) j.task.stop();
  medJobs.length = 0;
}

export function rescheduleAll(): void {
  clearAllMedJobs();

  const meds = listActiveMeds();
  const users = listUsers();

  for (const med of meds) {
    if (!med.schedule_cron) continue;
    if (!cron.validate(med.schedule_cron)) {
      console.warn(`Invalid cron for med #${med.id}: ${med.schedule_cron}`);
      continue;
    }
    const task = cron.schedule(med.schedule_cron, () => {
      for (const u of users) {
        void sendMedReminder(u.chat_id, med.id);
      }
    }, { timezone: "Europe/Moscow" });
    medJobs.push({ task, medId: med.id, cronExpr: med.schedule_cron });
  }

  console.log(`[scheduler] meds: ${medJobs.length} jobs active`);
}

export function startFeelingSurveys(): void {
  // Старые опросы — снять
  for (const j of feelingJobs) j.stop();
  feelingJobs = [];

  // 3 раза в день: утром, в обед, вечером
  // Можно настроить через FEELING_TIMES env, иначе дефолт
  const times = (process.env.FEELING_TIMES ?? "10:00,15:00,21:00")
    .split(",").map((s) => s.trim());

  for (const t of times) {
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    const expr = `${mm} ${h} * * *`;
    const task = cron.schedule(expr, () => {
      const chatId = getPrimaryChatId();
      if (chatId !== null) {
        void sendFeelingPrompt(chatId);
      }
    }, { timezone: "Europe/Moscow" });
    feelingJobs.push(task);
  }

  console.log(`[scheduler] feeling surveys: ${feelingJobs.length} times/day (${times.join(", ")})`);
}
