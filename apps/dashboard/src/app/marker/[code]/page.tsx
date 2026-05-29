import { listMarkerHistory, getMarkerMeta } from "@/lib/queries";
import { MarkerChart } from "@/components/MarkerChart";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarkerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const meta = getMarkerMeta(code);
  if (!meta) return notFound();
  const history = listMarkerHistory(code);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{meta.name}</h1>
        <div className="text-sm text-neutral-500">
          код: <code>{code}</code> • норма {meta.ref_low ?? "?"}–{meta.ref_high ?? "?"} {meta.unit}
        </div>
      </div>

      <MarkerChart data={history.map((p) => ({ date: p.date, value: p.value, lab_name: p.lab_name }))}
                   refLow={meta.ref_low} refHigh={meta.ref_high} unit={meta.unit} />

      <table className="w-full text-sm border-collapse">
        <thead className="bg-neutral-100">
          <tr><th className="p-2 text-left">Дата</th><th className="p-2 text-left">Лаборатория</th><th className="p-2 text-right">Значение</th><th className="p-2">Флаг</th></tr>
        </thead>
        <tbody>
          {history.map((p, i) => (
            <tr key={i} className="border-t">
              <td className="p-2"><a className="text-blue-700" href={`/lab/${p.lab_id}`}>{p.date}</a></td>
              <td className="p-2">{p.lab_name}</td>
              <td className="p-2 text-right">{p.value ?? "—"} {p.unit}</td>
              <td className="p-2 text-center">{p.flag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
