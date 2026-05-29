import { listMarkerSummaries } from "@/lib/queries";
import { classifyMarker } from "@health/shared";

export const dynamic = "force-dynamic";

function badge(flag: string): string {
  if (flag === "low") return "bg-blue-100 text-blue-800";
  if (flag === "high") return "bg-orange-100 text-orange-800";
  if (flag === "critical") return "bg-red-100 text-red-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function HomePage() {
  const summaries = listMarkerSummaries();

  const pinned = summaries.filter((s) => classifyMarker(s.code, s.last_flag) === "pinned");
  const abnormal = summaries.filter((s) => classifyMarker(s.code, s.last_flag) === "abnormal");
  const other = summaries.filter((s) => {
    const c = classifyMarker(s.code, s.last_flag);
    return c === "other" || c === "screening";
  });

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Snapshot</h1>

      {abnormal.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3">⚠ Отклонения ({abnormal.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {abnormal.map((s) => <Card key={s.code} s={s} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium mb-3">
          В фокусе {pinned.length > 0 && <span className="text-neutral-400 font-normal">({pinned.length})</span>}
        </h2>
        {pinned.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinned.map((s) => <Card key={s.code} s={s} />)}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">
            Ни одного главного показателя пока не загружено. См. PINNED_CODES в <code>packages/shared/src/markers-config.ts</code>.
          </div>
        )}
      </section>

      {other.length > 0 && (
        <details className="group">
          <summary className="text-lg font-medium cursor-pointer select-none list-none flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90">▶</span>
            Остальное в норме ({other.length})
          </summary>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {other.map((s) => <Card key={s.code} s={s} />)}
          </div>
        </details>
      )}
    </div>
  );
}

function Card({ s }: { s: ReturnType<typeof listMarkerSummaries>[number] }) {
  const value = s.last_value !== null ? s.last_value : s.last_value_text ?? "—";
  return (
    <a href={`/marker/${s.code}`} className="block rounded-lg border bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-medium leading-tight">{s.name}</div>
        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${badge(s.last_flag)}`}>{s.last_flag}</span>
      </div>
      {s.last_panel && (
        <div className="mt-0.5 text-xs text-neutral-500 italic">{s.last_panel}</div>
      )}
      <div className="mt-1 text-2xl font-semibold">{value} <span className="text-sm font-normal text-neutral-500">{s.unit}</span></div>
      <div className="mt-1 text-xs text-neutral-500">{s.last_date} • норма {s.ref_low ?? "?"}–{s.ref_high ?? "?"}</div>
    </a>
  );
}
