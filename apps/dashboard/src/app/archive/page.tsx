import { listAllLabs } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ q?: string; lab?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").toLowerCase().trim();
  const labFilter = (sp.lab ?? "").trim();

  let labs = listAllLabs();
  if (q) labs = labs.filter((l) => (l.lab_name + " " + (l.panel ?? "")).toLowerCase().includes(q));
  if (labFilter) labs = labs.filter((l) => l.lab_name === labFilter);

  const knownLabs = Array.from(new Set(listAllLabs().map((l) => l.lab_name))).sort();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Архив</h1>

      <form className="flex gap-3 items-end">
        <div>
          <label className="block text-sm">Поиск</label>
          <input name="q" defaultValue={sp.q ?? ""} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm">Лаборатория</label>
          <select name="lab" defaultValue={sp.lab ?? ""} className="border rounded px-2 py-1">
            <option value="">все</option>
            {knownLabs.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button className="bg-blue-600 text-white rounded px-3 py-1.5">Применить</button>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead className="bg-neutral-100">
          <tr>
            <th className="p-2 text-left">Дата</th>
            <th className="p-2 text-left">Лаборатория</th>
            <th className="p-2 text-left">Панель</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {labs.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="p-2">{l.date}</td>
              <td className="p-2">{l.lab_name}</td>
              <td className="p-2">{l.panel ?? "—"}</td>
              <td className="p-2"><a className="text-blue-700" href={`/lab/${l.id}`}>открыть</a></td>
            </tr>
          ))}
        </tbody>
      </table>

      {labs.length === 0 && <div className="text-sm text-neutral-500">Ничего не найдено</div>}
    </div>
  );
}
