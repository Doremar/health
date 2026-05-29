import { listMarkerHistory, getMarkerMeta } from "@/lib/queries";
import { MarkerChart } from "@/components/MarkerChart";
import { PageHeader } from "@/components/PageHeader";
import { FlagPill } from "@/components/FlagPill";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MarkerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const meta = getMarkerMeta(code);
  if (!meta) return notFound();
  const history = listMarkerHistory(code);

  return (
    <>
      <PageHeader
        title={meta.name}
        meta={`код: ${code} · норма ${meta.ref_low ?? "?"}–${meta.ref_high ?? "?"} ${meta.unit ?? ""}`}
      />
      {meta.panel && (
        <div className="-mt-5 mb-7 text-sm italic text-text-subtle">{meta.panel}</div>
      )}

      <MarkerChart
        data={history.map((p) => ({ date: p.date, value: p.value, lab_name: p.lab_name }))}
        refLow={meta.ref_low}
        refHigh={meta.ref_high}
        unit={meta.unit}
      />

      <div className="mt-7 bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Дата</th>
              <th className="p-3 text-left font-medium">Лаборатория</th>
              <th className="p-3 text-right font-medium">Значение</th>
              <th className="p-3 text-center font-medium">Флаг</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p, i) => (
              <tr key={i} className="border-t border-border-soft">
                <td className="p-3">
                  <Link href={`/lab/${p.lab_id}`} className="text-flag-low hover:underline">{p.date}</Link>
                </td>
                <td className="p-3 text-text-muted">{p.lab_name}</td>
                <td className="p-3 text-right tabular text-text-primary">
                  {p.value ?? "—"} <span className="text-text-faint">{p.unit}</span>
                </td>
                <td className="p-3 text-center"><FlagPill flag={p.flag} size="sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
