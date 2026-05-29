/**
 * Превращает человеческую строку расписания в node-cron expression.
 * Возвращает null если не понял.
 *
 * Примеры:
 *   "09:00"            → "0 9 * * *"
 *   "9"                → "0 9 * * *"
 *   "09:00, 21:00"     → "0 9,21 * * *"
 *   "утром"            → "0 9 * * *"
 *   "вечером"          → "0 21 * * *"
 *   "утром и вечером"  → "0 9,21 * * *"
 *   "каждые 6 часов"   → "0 *\/6 * * *"
 */
export function parseScheduleToCron(text: string): string | null {
  const t = text.trim().toLowerCase();

  const everyN = t.match(/каждые?\s+(\d+)\s*час/);
  if (everyN) {
    const n = Number(everyN[1]);
    if (n >= 1 && n <= 23) return `0 */${n} * * *`;
  }

  if (t === "утром") return "0 9 * * *";
  if (t === "вечером") return "0 21 * * *";
  if (t === "днём" || t === "днем") return "0 14 * * *";
  if (t === "ночью") return "0 23 * * *";
  if (/утром\s*(?:и|,)\s*вечером/.test(t) || /утро\s*(?:и|,)\s*вечер/.test(t)) return "0 9,21 * * *";
  if (/утром.*днём.*вечером|3\s*раза/.test(t)) return "0 9,14,21 * * *";

  const times: { h: number; m: number }[] = [];
  const parts = t.split(/[,\sи]+/).filter(Boolean);
  for (const p of parts) {
    const hhmm = p.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!hhmm) continue;
    const h = Number(hhmm[1]);
    const m = hhmm[2] ? Number(hhmm[2]) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) times.push({ h, m });
  }
  if (times.length === 0) return null;

  const allSameMin = times.every((tt) => tt.m === times[0]!.m);
  if (allSameMin) {
    const hours = times.map((tt) => tt.h).join(",");
    return `${times[0]!.m} ${hours} * * *`;
  }
  return `${times[0]!.m} ${times[0]!.h} * * *`;
}
