import { listMarkerHistory, getMarkerMeta } from "@/lib/queries";
import { MarkerChart } from "@/components/MarkerChart";
import { PageHeader } from "@/components/PageHeader";
import { ClickableRow } from "@/components/ClickableRow";
import { notFound } from "next/navigation";
import type { Flag } from "@health/shared";

const FLAG_LABEL: Record<Flag, string> = {
  normal: "Норма",
  low: "Ниже нормы",
  high: "Выше нормы",
  critical: "Критическое отклонение",
};

const FLAG_COLOR: Record<Flag, string> = {
  normal: "text-flag-normal",
  low: "text-flag-low",
  high: "text-flag-high",
  critical: "text-flag-critical",
};

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
        <table className="w-full text-sm table-fixed">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-center font-medium w-1/4">Дата</th>
              <th className="p-3 text-center font-medium w-1/4">Лаборатория</th>
              <th className="p-3 text-center font-medium w-1/4">Значение</th>
              <th className="p-3 text-center font-medium w-1/4">Состояние</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p, i) => (
              <ClickableRow key={i} href={`/lab/${p.lab_id}`}>
                <td className="p-3 text-center text-text-primary tabular">{p.date}</td>
                <td className="p-3 text-center text-text-muted">{p.lab_name}</td>
                <td className="p-3 text-center tabular text-text-primary">
                  {p.value ?? "—"} <span className="text-text-faint">{p.unit}</span>
                </td>
                <td className={`p-3 text-center ${FLAG_COLOR[p.flag]}`}>{FLAG_LABEL[p.flag]}</td>
              </ClickableRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
