import { listRecentFeelings, getFeelingStats } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";

export const dynamic = "force-dynamic";

const MOOD_EMOJI: Record<number, string> = { 1: "😢", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };
const ENERGY_EMOJI: Record<number, string> = { 1: "😵", 2: "😴", 3: "😐", 4: "⚡", 5: "🔥" };

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function FeelingsPage() {
  const feelings = listRecentFeelings(50);
  const stats = getFeelingStats();

  return (
    <>
      <PageHeader title="Самочувствие" meta={`${stats.count} записей`} />

      {stats.count > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
          <div className="bg-bg-surface border border-border-soft rounded-2xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-text-faint">Среднее настроение</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-text-primary tabular">
              {stats.avgMood?.toFixed(2) ?? "—"}
              <span className="text-base font-normal text-text-faint ml-2">/ 5</span>
            </div>
          </div>
          <div className="bg-bg-surface border border-border-soft rounded-2xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-text-faint">Средняя энергия</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-text-primary tabular">
              {stats.avgEnergy?.toFixed(2) ?? "—"}
              <span className="text-base font-normal text-text-faint ml-2">/ 5</span>
            </div>
          </div>
        </div>
      )}

      <SectionHeader label="Добавить вручную" />
      <form action="/api/feeling" method="POST" className="bg-bg-surface border border-border-soft rounded-2xl p-5 mb-7 space-y-4">
        <div>
          <label className="block text-xs text-text-faint mb-2">Настроение</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="mood" value={n} required className="peer sr-only" />
                <div className="w-12 h-12 rounded-lg border border-border-card flex items-center justify-center text-xl bg-bg-surface peer-checked:border-flag-low peer-checked:bg-bg-elevated transition-colors">
                  {MOOD_EMOJI[n]}
                </div>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-2">Энергия</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="energy" value={n} required className="peer sr-only" />
                <div className="w-12 h-12 rounded-lg border border-border-card flex items-center justify-center text-xl bg-bg-surface peer-checked:border-flag-low peer-checked:bg-bg-elevated transition-colors">
                  {ENERGY_EMOJI[n]}
                </div>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-2">Заметка (опционально)</label>
          <input
            type="text"
            name="notes"
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
            placeholder="что-то особенное о сегодня"
          />
        </div>
        <button type="submit" className="bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium">
          Записать
        </button>
      </form>

      <SectionHeader label="История" count={feelings.length} />
      {feelings.length === 0 ? (
        <div className="text-sm text-text-faint">
          Пока пусто. Зайди в Telegram-бот <a href="https://t.me/codebrotebot" className="text-flag-low hover:underline">@codebrotebot</a> и отправь /feeling, или заполни форму выше.
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-text-faint">
              <tr>
                <th className="p-3 text-left font-medium">Время</th>
                <th className="p-3 text-center font-medium">Настроение</th>
                <th className="p-3 text-center font-medium">Энергия</th>
                <th className="p-3 text-left font-medium">Заметка</th>
                <th className="p-3 text-center font-medium">Источник</th>
              </tr>
            </thead>
            <tbody>
              {feelings.map((f) => (
                <tr key={f.id} className="border-t border-border-soft">
                  <td className="p-3 text-text-primary tabular">{formatTs(f.ts)}</td>
                  <td className="p-3 text-center text-xl">
                    {f.mood ? `${MOOD_EMOJI[f.mood]} ${f.mood}` : "—"}
                  </td>
                  <td className="p-3 text-center text-xl">
                    {f.energy ? `${ENERGY_EMOJI[f.energy]} ${f.energy}` : "—"}
                  </td>
                  <td className="p-3 text-text-muted">{f.notes ?? "—"}</td>
                  <td className="p-3 text-center text-xs text-text-faint">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
