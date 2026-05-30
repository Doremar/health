import {
  getNutritionTarget, getNutritionToday, listNutritionToday, listNutritionByDay,
} from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Apple } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { day: "2-digit", month: "short", weekday: "short" });
}

function pct(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

function barColor(p: number, kind: "calories" | "macro"): string {
  // Для калорий: <80 синий, 80-110 зелёный, >110 оранжевый
  // Для макро: <70 синий, 70-130 зелёный, >130 оранжевый
  const upperGreen = kind === "calories" ? 110 : 130;
  const lowerGreen = kind === "calories" ? 80 : 70;
  if (p < lowerGreen) return "var(--flag-low)";
  if (p > upperGreen) return "var(--flag-high)";
  return "var(--flag-normal)";
}

function ProgressBar({ value, target, kind, label, unit }: {
  value: number;
  target: number;
  kind: "calories" | "macro";
  label: string;
  unit: string;
}) {
  const p = pct(value, target);
  const color = barColor(p, kind);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-text-faint">{label}</span>
        <span className="text-xs text-text-faint">
          <span className="font-medium text-text-primary tabular">{Math.round(value)}</span>
          {" / "}{target} {unit} · <span style={{ color }}>{p}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, p)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const target = getNutritionTarget();
  const today = getNutritionToday();
  const todayMeals = listNutritionToday();
  const history = listNutritionByDay(14);

  return (
    <>
      <PageHeader title="Питание" meta={`сегодня: ${today.count} приёмов`} />

      <SectionHeader label="Сегодня" />
      <div className="bg-bg-surface border border-border-soft rounded-2xl p-6 mb-7 space-y-5">
        <ProgressBar value={today.calories} target={target.daily_calories} kind="calories" label="🔥 Калории" unit="ккал" />
        <ProgressBar value={today.protein_g} target={target.protein_g} kind="macro" label="💪 Белки" unit="г" />
        <ProgressBar value={today.fat_g} target={target.fat_g} kind="macro" label="🥑 Жиры" unit="г" />
        <ProgressBar value={today.carbs_g} target={target.carbs_g} kind="macro" label="🍞 Углеводы" unit="г" />
      </div>

      <SectionHeader label="Приёмы пищи" count={todayMeals.length} />
      {todayMeals.length === 0 ? (
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-8 text-center mb-7">
          <Apple size={32} className="mx-auto text-text-disabled mb-3" />
          <div className="text-text-faint text-sm">
            За сегодня пусто. Пришли фото еды в Telegram-бот <a href="https://t.me/codebrotebot" className="text-flag-low hover:underline">@codebrotebot</a> — он распознает и посчитает.
          </div>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden mb-7">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-text-faint">
              <tr>
                <th className="p-3 text-left font-medium">Время</th>
                <th className="p-3 text-left font-medium">Что</th>
                <th className="p-3 text-right font-medium">Ккал</th>
                <th className="p-3 text-right font-medium">Б</th>
                <th className="p-3 text-right font-medium">Ж</th>
                <th className="p-3 text-right font-medium">У</th>
                <th className="p-3 text-center font-medium">Точн.</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {todayMeals.map((m) => (
                <tr key={m.id} className="border-t border-border-soft">
                  <td className="p-3 tabular text-text-primary">{fmtTime(m.ts)}</td>
                  <td className="p-3 text-text-muted">{m.description ?? "—"}</td>
                  <td className="p-3 text-right tabular text-text-primary">{m.calories ? Math.round(m.calories) : "—"}</td>
                  <td className="p-3 text-right tabular text-text-muted">{m.protein_g ? Math.round(m.protein_g) : "—"}</td>
                  <td className="p-3 text-right tabular text-text-muted">{m.fat_g ? Math.round(m.fat_g) : "—"}</td>
                  <td className="p-3 text-right tabular text-text-muted">{m.carbs_g ? Math.round(m.carbs_g) : "—"}</td>
                  <td className="p-3 text-center text-xs text-text-faint">{m.confidence ?? "—"}</td>
                  <td className="p-3 text-right">
                    <form action="/api/nutrition" method="POST" className="inline">
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="text-text-faint hover:text-flag-critical text-xs">×</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionHeader label="История по дням" count={history.length} />
      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden mb-7">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Дата</th>
              <th className="p-3 text-right font-medium">Ккал</th>
              <th className="p-3 text-right font-medium">Б</th>
              <th className="p-3 text-right font-medium">Ж</th>
              <th className="p-3 text-right font-medium">У</th>
              <th className="p-3 text-right font-medium">Приёмов</th>
              <th className="p-3 text-left font-medium">К норме</th>
            </tr>
          </thead>
          <tbody>
            {history.map((d) => {
              const p = pct(d.calories, target.daily_calories);
              return (
                <tr key={d.date} className="border-t border-border-soft">
                  <td className="p-3 tabular text-text-primary">{fmtDate(d.date)}</td>
                  <td className="p-3 text-right tabular text-text-primary">{Math.round(d.calories)}</td>
                  <td className="p-3 text-right tabular text-text-muted">{Math.round(d.protein_g)}</td>
                  <td className="p-3 text-right tabular text-text-muted">{Math.round(d.fat_g)}</td>
                  <td className="p-3 text-right tabular text-text-muted">{Math.round(d.carbs_g)}</td>
                  <td className="p-3 text-right tabular text-text-muted">{d.count}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-bg-elevated overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, p)}%`, backgroundColor: barColor(p, "calories") }} />
                      </div>
                      <span className="text-xs text-text-faint tabular">{p}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHeader label="Дневная норма" />
      <form action="/api/nutrition" method="POST" className="bg-bg-surface border border-border-soft rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <input type="hidden" name="action" value="update_target" />
        <div>
          <label className="block text-xs text-text-faint mb-1">Ккал</label>
          <input type="number" name="daily_calories" defaultValue={target.daily_calories} required
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary tabular focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Белки, г</label>
          <input type="number" name="protein_g" defaultValue={target.protein_g} required
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary tabular focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Жиры, г</label>
          <input type="number" name="fat_g" defaultValue={target.fat_g} required
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary tabular focus:outline-none focus:border-border-active" />
        </div>
        <div>
          <label className="block text-xs text-text-faint mb-1">Углеводы, г</label>
          <input type="number" name="carbs_g" defaultValue={target.carbs_g} required
            className="w-full bg-bg-elevated border border-border-card rounded-md px-3 py-2 text-sm text-text-primary tabular focus:outline-none focus:border-border-active" />
        </div>
        <div className="col-span-2 md:col-span-4">
          <button type="submit" className="bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium">
            Сохранить норму
          </button>
        </div>
      </form>
    </>
  );
}
