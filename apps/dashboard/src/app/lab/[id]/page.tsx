import { getLab, listLabMarkers } from "@/lib/queries";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lab = getLab(Number(id));
  if (!lab) return notFound();
  const markers = listLabMarkers(lab.id) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {lab.panel ? lab.panel + " — " : ""}{lab.lab_name} — {lab.date}
        </h1>
        {lab.needs_review === 1 && (
          <div className="mt-1 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">проверить</div>
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead className="bg-neutral-100">
          <tr>
            <th className="p-2 text-left">Код</th>
            <th className="p-2 text-left">Название</th>
            <th className="p-2 text-right">Значение</th>
            <th className="p-2 text-left">Норма</th>
            <th className="p-2 text-center">Флаг</th>
          </tr>
        </thead>
        <tbody>
          {markers.map((m, i) => (
            <tr key={i} className="border-t">
              <td className="p-2"><a className="text-blue-700" href={`/marker/${m.code}`}>{m.code}</a></td>
              <td className="p-2">{m.name}</td>
              <td className="p-2 text-right">{m.value ?? m.value_text ?? "—"} {m.unit}</td>
              <td className="p-2">{m.ref_low ?? "—"}–{m.ref_high ?? "—"} {m.ref_text ? `(${m.ref_text})` : ""}</td>
              <td className="p-2 text-center">{m.flag}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-3">
        <a className="text-blue-700 underline" href={`/api/file?path=${encodeURIComponent(lab.source_file)}`}>Открыть PDF</a>
        <form action="/api/delete-lab" method="POST">
          <input type="hidden" name="id" value={lab.id} />
          <button className="text-red-600 underline" type="submit">Удалить сдачу</button>
        </form>
      </div>
    </div>
  );
}
