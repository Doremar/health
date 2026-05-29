import { listMeds, listRecentIntakes, getIntakeStats } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Pill } from "lucide-react";

export const dynamic = "force-dynamic";

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, string> = {
  taken: "text-flag-normal",
  skipped: "text-flag-critical",
  snooze: "text-flag-high",
};
const STATUS_LABEL: Record<string, string> = {
  taken: "✓ принял",
  skipped: "⊘ пропуск",
  snooze: "⏰ +30мин",
};

export default function MedsPage() {
  const meds = listMeds(true);
  const active = meds.filter((m) => m.active === 1);
  const inactive = meds.filter((m) => m.active === 0);
  const intakes = listRecentIntakes(20);

  return (
    <>
      <PageHeader title="Лекарства и БАД" meta={`${active.length} активных · ${inactive.length} архив`} />

      <SectionHeader label="Добавить новое" />
      <form action="/api/med" method="POST" className="bg-bg-surface border border-border-soft rounded-2xl p-5 mb-7 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-xs text-text-faint mb-1">Название *</label>
          <input
            type="text"
            name="name"
            required
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
            placeholder="Витамин D"
          />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Доза</label>
          <input
            type="text"
            name="dose"
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
            placeholder="5000 МЕ"
          />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Расписание</label>
          <input
            type="text"
            name="schedule_hint"
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
            placeholder="09:00 или утром и вечером"
          />
        </div>
        <div className="md:col-span-3 flex items-center justify-between">
          <div className="text-xs text-text-faint">
            Бот напомнит в назначенное время — кнопки «✓ Принял / ⊘ Пропуск / ⏰ +30мин».
          </div>
          <button type="submit" className="bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium">
            Добавить
          </button>
        </div>
      </form>

      <SectionHeader label="Активные" count={active.length} />
      {active.length === 0 ? (
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-8 text-center">
          <Pill size={28} className="mx-auto text-text-disabled mb-2" />
          <div className="text-text-faint text-sm">
            Ни одного активного. Добавь выше или через бота: <code className="text-text-muted">/addmed</code>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((m) => {
            const stats = getIntakeStats(m.id);
            return (
              <div key={m.id} className="bg-gradient-to-b from-bg-elevated to-bg-surface border border-border-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-text-primary">{m.name}</div>
                    {m.dose && <div className="text-xs text-text-faint mt-0.5">{m.dose}</div>}
                  </div>
                  <form action="/api/med" method="POST" className="shrink-0">
                    <input type="hidden" name="action" value="deactivate" />
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="text-text-faint hover:text-flag-critical text-xs">снять</button>
                  </form>
                </div>
                {m.schedule_hint && (
                  <div className="mt-3 text-xs text-text-subtle">
                    ⏰ {m.schedule_hint}
                    {m.schedule_cron && (
                      <span className="text-text-disabled ml-1.5 font-mono">({m.schedule_cron})</span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-3 text-xs">
                  <span className="text-flag-normal">✓ {stats.taken}</span>
                  <span className="text-flag-critical">⊘ {stats.skipped}</span>
                  <span className="text-flag-high">⏰ {stats.snooze}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {intakes.length > 0 && (
        <>
          <SectionHeader label="Журнал приёма" count={intakes.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-text-faint">
                <tr>
                  <th className="p-3 text-left font-medium">Время</th>
                  <th className="p-3 text-left font-medium">Лекарство</th>
                  <th className="p-3 text-center font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {intakes.map((i) => (
                  <tr key={i.id} className="border-t border-border-soft">
                    <td className="p-3 text-text-primary tabular">{formatTs(i.ts)}</td>
                    <td className="p-3 text-text-muted">{i.med_name}</td>
                    <td className={`p-3 text-center text-xs ${STATUS_STYLE[i.status]}`}>
                      {STATUS_LABEL[i.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {inactive.length > 0 && (
        <details className="group mt-9">
          <summary className="flex items-center gap-2.5 px-4 py-3 bg-bg-surface border border-border-soft rounded-xl cursor-pointer text-text-subtle text-[13px] list-none">
            <span className="text-text-disabled transition-transform group-open:rotate-90">▶</span>
            <span className="text-text-primary font-medium">{inactive.length}</span>
            <span>снятых с приёма</span>
          </summary>
          <div className="mt-3 space-y-1 text-sm text-text-muted">
            {inactive.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-bg-surface/40 border border-border-soft/50 rounded px-3 py-2">
                <span>{m.name}{m.dose ? ` · ${m.dose}` : ""}</span>
                <span className="text-xs text-text-faint">
                  {m.ended_at && `до ${formatTs(m.ended_at)}`}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
