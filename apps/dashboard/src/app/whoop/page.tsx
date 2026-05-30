import {
  isWhoopConnected, getWhoopSummary,
  listRecentRecovery, listRecentCycles, listRecentSleeps, listRecentWorkouts,
} from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Watch } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtHours(ms: number | null): string {
  if (ms === null) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return `${h}ч ${m.toString().padStart(2, "0")}м`;
}

function fmtTs(ts: string): string {
  return new Date(ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function recoveryColor(score: number | null): string {
  if (score === null) return "var(--text-faint)";
  if (score >= 67) return "var(--flag-normal)";
  if (score >= 34) return "var(--flag-high)";
  return "var(--flag-critical)";
}

function strainColor(strain: number | null): string {
  if (strain === null) return "var(--text-faint)";
  if (strain >= 14) return "var(--flag-high)";
  if (strain >= 10) return "var(--flag-low)";
  return "var(--text-strong)";
}

export default function WhoopPage() {
  if (!isWhoopConnected()) {
    return (
      <>
        <PageHeader title="Whoop" meta="не подключено" />
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-10 text-center">
          <Watch size={40} className="mx-auto text-text-disabled mb-4" />
          <h2 className="text-text-strong text-lg mb-2">Whoop ещё не подключён</h2>
          <p className="text-text-faint text-sm max-w-lg mx-auto mb-6">
            Нужно зарегистрировать приложение в Whoop Developer Portal и подключить аккаунт через OAuth.
          </p>
          <div className="text-left text-xs text-text-muted bg-bg-page border border-border-soft rounded-lg p-4 max-w-lg mx-auto font-mono">
            <div className="text-text-faint mb-2"># 1. Получи client_id/secret на</div>
            <div className="mb-2">https://developer.whoop.com</div>
            <div className="text-text-faint mb-2"># 2. Создай App с Redirect URI:</div>
            <div className="mb-2">http://localhost:8765/callback</div>
            <div className="text-text-faint mb-2"># 3. Положи в ~/projects/health/.env:</div>
            <div className="mb-2">WHOOP_CLIENT_ID=...</div>
            <div className="mb-2">WHOOP_CLIENT_SECRET=...</div>
            <div className="text-text-faint mb-2"># 4. Запусти OAuth:</div>
            <div className="mb-2">pnpm --filter @health/whoop-sync auth</div>
            <div className="text-text-faint mb-2"># 5. Подтяни данные за 30 дней:</div>
            <div>pnpm --filter @health/whoop-sync sync</div>
          </div>
        </div>
      </>
    );
  }

  const summary = getWhoopSummary();
  const recovery = listRecentRecovery(30);
  const cycles = listRecentCycles(30);
  const sleeps = listRecentSleeps(30);
  const workouts = listRecentWorkouts(20);

  return (
    <>
      <PageHeader title="Whoop" meta={`recovery: ${recovery.length} · sleeps: ${sleeps.length} · workouts: ${workouts.length}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-faint">Recovery</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight tabular" style={{ color: recoveryColor(summary.latestRecovery) }}>
            {summary.latestRecovery ?? "—"}<span className="text-base font-normal text-text-faint">%</span>
          </div>
        </div>
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-faint">Strain (день)</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight tabular" style={{ color: strainColor(summary.latestStrain) }}>
            {summary.latestStrain?.toFixed(1) ?? "—"}
          </div>
        </div>
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-faint">Сон</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight tabular text-text-primary">
            {fmtHours(summary.latestSleepDurationMs)}
          </div>
        </div>
        <div className="bg-bg-surface border border-border-soft rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-text-faint">HRV (avg 7д)</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight tabular text-text-primary">
            {summary.hrvAvg7d?.toFixed(0) ?? "—"}<span className="text-base font-normal text-text-faint"> мс</span>
          </div>
        </div>
      </div>

      {recovery.length > 0 && (
        <>
          <SectionHeader label="Recovery" count={recovery.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden mb-7">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-text-faint">
                <tr>
                  <th className="p-3 text-left font-medium">Дата</th>
                  <th className="p-3 text-right font-medium">Score</th>
                  <th className="p-3 text-right font-medium">RHR</th>
                  <th className="p-3 text-right font-medium">HRV (мс)</th>
                </tr>
              </thead>
              <tbody>
                {recovery.map((r) => (
                  <tr key={r.whoop_cycle_id} className="border-t border-border-soft">
                    <td className="p-3 tabular text-text-primary">{fmtTs(r.created_at)}</td>
                    <td className="p-3 text-right tabular font-semibold" style={{ color: recoveryColor(r.recovery_score) }}>
                      {r.recovery_score ?? "—"}{r.recovery_score !== null ? "%" : ""}
                    </td>
                    <td className="p-3 text-right tabular text-text-muted">{r.resting_hr ?? "—"}</td>
                    <td className="p-3 text-right tabular text-text-muted">{r.hrv_rmssd_ms?.toFixed(0) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sleeps.length > 0 && (
        <>
          <SectionHeader label="Сон" count={sleeps.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden mb-7">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-text-faint">
                <tr>
                  <th className="p-3 text-left font-medium">Начало</th>
                  <th className="p-3 text-right font-medium">Длительность</th>
                  <th className="p-3 text-right font-medium">Эффективность</th>
                  <th className="p-3 text-right font-medium">REM</th>
                  <th className="p-3 text-right font-medium">SWS</th>
                  <th className="p-3 text-center font-medium">Тип</th>
                </tr>
              </thead>
              <tbody>
                {sleeps.map((s) => (
                  <tr key={s.whoop_id} className="border-t border-border-soft">
                    <td className="p-3 tabular text-text-primary">{fmtTs(s.start_ts)}</td>
                    <td className="p-3 text-right tabular text-text-muted">
                      {fmtHours((s.total_in_bed_ms ?? 0) - (s.total_awake_ms ?? 0))}
                    </td>
                    <td className="p-3 text-right tabular text-text-muted">
                      {s.sleep_efficiency_pct?.toFixed(0) ?? "—"}%
                    </td>
                    <td className="p-3 text-right tabular text-text-muted">{fmtHours(s.total_rem_sleep_ms)}</td>
                    <td className="p-3 text-right tabular text-text-muted">{fmtHours(s.total_slow_wave_sleep_ms)}</td>
                    <td className="p-3 text-center text-xs text-text-faint">{s.nap ? "nap" : "ночь"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {workouts.length > 0 && (
        <>
          <SectionHeader label="Тренировки" count={workouts.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden mb-7">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-text-faint">
                <tr>
                  <th className="p-3 text-left font-medium">Когда</th>
                  <th className="p-3 text-left font-medium">Спорт</th>
                  <th className="p-3 text-right font-medium">Strain</th>
                  <th className="p-3 text-right font-medium">Avg HR</th>
                  <th className="p-3 text-right font-medium">Max HR</th>
                  <th className="p-3 text-right font-medium">км</th>
                </tr>
              </thead>
              <tbody>
                {workouts.map((w) => (
                  <tr key={w.whoop_id} className="border-t border-border-soft">
                    <td className="p-3 tabular text-text-primary">{fmtTs(w.start_ts)}</td>
                    <td className="p-3 text-text-muted">{w.sport_name ?? "—"}</td>
                    <td className="p-3 text-right tabular font-semibold" style={{ color: strainColor(w.strain) }}>
                      {w.strain?.toFixed(1) ?? "—"}
                    </td>
                    <td className="p-3 text-right tabular text-text-muted">{w.average_hr ?? "—"}</td>
                    <td className="p-3 text-right tabular text-text-muted">{w.max_hr ?? "—"}</td>
                    <td className="p-3 text-right tabular text-text-muted">
                      {w.distance_meter ? (w.distance_meter / 1000).toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {cycles.length > 0 && (
        <>
          <SectionHeader label="Циклы (день)" count={cycles.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-text-faint">
                <tr>
                  <th className="p-3 text-left font-medium">Дата</th>
                  <th className="p-3 text-right font-medium">Strain</th>
                  <th className="p-3 text-right font-medium">Avg HR</th>
                  <th className="p-3 text-right font-medium">Max HR</th>
                  <th className="p-3 text-right font-medium">ккал</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.whoop_id} className="border-t border-border-soft">
                    <td className="p-3 tabular text-text-primary">{fmtTs(c.start_ts)}</td>
                    <td className="p-3 text-right tabular font-semibold" style={{ color: strainColor(c.strain) }}>
                      {c.strain?.toFixed(1) ?? "—"}
                    </td>
                    <td className="p-3 text-right tabular text-text-muted">{c.average_hr ?? "—"}</td>
                    <td className="p-3 text-right tabular text-text-muted">{c.max_hr ?? "—"}</td>
                    <td className="p-3 text-right tabular text-text-muted">
                      {c.kilojoules ? Math.round(c.kilojoules / 4.184) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
