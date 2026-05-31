import { searchLabs, listAllLabs } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { ArchiveFilters } from "@/components/ArchiveFilters";
import { ClickableRow } from "@/components/ClickableRow";

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

      <ArchiveFilters knownLabs={knownLabs} />

      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Дата</th>
              <th className="p-3 text-left font-medium">Лаборатория</th>
              <th className="p-3 text-left font-medium">Анализ</th>
              {q && <th className="p-3 text-left font-medium">Совпадения</th>}
            </tr>
          </thead>
          <tbody>
            {labs.map((l) => (
              <ClickableRow key={l.id} href={`/lab/${l.id}`}>
                <td className="p-3 text-text-primary tabular align-top">{l.date}</td>
                <td className="p-3 text-text-muted align-top">{l.lab_name}</td>
                <td className="p-3 text-text-muted align-top">{l.panel ?? "—"}</td>
                {q && (
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
                )}
              </ClickableRow>
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
