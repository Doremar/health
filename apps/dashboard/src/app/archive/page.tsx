import { searchLabs, listAllLabs } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ q?: string; lab?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const labFilter = (sp.lab ?? "").trim();

  const all = listAllLabs();
  const labs = searchLabs(q, labFilter);

  const knownLabs = Array.from(new Set(all.map((l) => l.lab_name))).sort();

  return (
    <>
      <PageHeader title="Архив" meta={`${labs.length} из ${all.length} сдач`} />

      <form className="flex gap-3 items-end mb-6">
        <div className="flex-1 max-w-md">
          <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">Поиск</label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            className="w-full bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-active"
            placeholder="лаборатория, панель или маркер (холестерин, ferritin, моча...)"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">Лаборатория</label>
          <select
            name="lab"
            defaultValue={sp.lab ?? ""}
            className="bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
          >
            <option value="">все</option>
            {knownLabs.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button className="bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium">Применить</button>
      </form>

      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Дата</th>
              <th className="p-3 text-left font-medium">Лаборатория</th>
              <th className="p-3 text-left font-medium">Панель</th>
              <th className="p-3 text-left font-medium">Совпадения</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {labs.map((l) => (
              <tr key={l.id} className="border-t border-border-soft hover:bg-bg-elevated/40 transition-colors">
                <td className="p-3 text-text-primary tabular align-top">{l.date}</td>
                <td className="p-3 text-text-muted align-top">{l.lab_name}</td>
                <td className="p-3 text-text-muted align-top">{l.panel ?? "—"}</td>
                <td className="p-3 align-top">
                  {l.matched_markers.length === 0 ? (
                    <span className="text-text-disabled">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {l.matched_markers.map((m) => (
                        <span key={m} className="text-[11px] bg-flag-low/10 text-flag-low px-2 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3 align-top">
                  <Link href={`/lab/${l.id}`} className="text-flag-low hover:underline text-xs whitespace-nowrap">открыть →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {labs.length === 0 && (
        <div className="mt-6 text-sm text-text-faint">Ничего не найдено</div>
      )}
    </>
  );
}
