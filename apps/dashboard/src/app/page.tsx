import { listMarkerSummaries } from "@/lib/queries";

export const dynamic = "force-dynamic";

function badge(flag: string): string {
  if (flag === "low") return "bg-blue-100 text-blue-800";
  if (flag === "high") return "bg-orange-100 text-orange-800";
  if (flag === "critical") return "bg-red-100 text-red-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function HomePage() {
  const summaries = listMarkerSummaries();
  const abnormal = summaries.filter((s) => s.last_flag !== "normal");
  const normal = summaries.filter((s) => s.last_flag === "normal");

  return (
    <div className="space-y-8">
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
        <h2 className="text-lg font-medium mb-3">В норме ({normal.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {normal.map((s) => <Card key={s.code} s={s} />)}
        </div>
      </section>
    </div>
  );
}

function Card({ s }: { s: ReturnType<typeof listMarkerSummaries>[number] }) {
  const value = s.last_value !== null ? s.last_value : s.last_value_text ?? "—";
  return (
    <a href={`/marker/${s.code}`} className="block rounded-lg border bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-baseline justify-between">
        <div className="font-medium">{s.name}</div>
        <span className={`text-xs px-2 py-0.5 rounded ${badge(s.last_flag)}`}>{s.last_flag}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold">{value} <span className="text-sm font-normal text-neutral-500">{s.unit}</span></div>
      <div className="mt-1 text-xs text-neutral-500">{s.last_date} • норма {s.ref_low ?? "?"}–{s.ref_high ?? "?"}</div>
    </a>
  );
}
