// apps/dashboard/src/app/studies/page.tsx
import { listAllStudies, searchStudies } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { ClickableRow } from "@/components/ClickableRow";
import { StudiesFilters } from "@/components/StudiesFilters";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  ecg: "ЭКГ", holter: "Холтер", smad: "СМАД",
  xray: "Рентген", fluorography: "Флюро",
  ct: "КТ", mri: "МРТ", usg: "УЗИ", other: "Другое",
};

const MODALITY_LABELS: Record<string, string> = {
  "кардиология": "Кардио", "лучевая": "Луч", "ультразвук": "УЗИ",
};

export default async function StudiesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; modality?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type = (sp.type ?? "").trim();
  const modality = (sp.modality ?? "").trim();

  const all = listAllStudies();
  const studies = searchStudies(q, type, modality);
  const knownTypes = Array.from(new Set(all.map((s) => s.type))).sort();
  const knownMods = Array.from(new Set(all.map((s) => s.modality).filter(Boolean) as string[])).sort();
  const needsReview = all.filter((s) => s.needs_review === 1).length;

  return (
    <>
      <PageHeader
        title="Исследования"
        meta={`${studies.length} из ${all.length}${needsReview > 0 ? ` · ${needsReview} требуют проверки` : ""}`}
      />

      <StudiesFilters
        knownTypes={knownTypes}
        knownMods={knownMods}
        typeLabels={TYPE_LABELS}
        modalityLabels={MODALITY_LABELS}
      />

      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Дата</th>
              <th className="p-3 text-left font-medium">Тип</th>
              <th className="p-3 text-left font-medium">Орган</th>
              <th className="p-3 text-left font-medium">Лаборатория</th>
              <th className="p-3 text-left font-medium">Заключение</th>
            </tr>
          </thead>
          <tbody>
            {studies.map((s) => {
              const snippet = (s.conclusion ?? "").slice(0, 80);
              return (
                <ClickableRow key={s.id} href={`/study/${s.id}`}>
                  <td className="p-3 text-text-primary tabular align-top">{s.date}</td>
                  <td className="p-3 text-text-muted align-top">
                    <span className="bg-bg-elevated text-text-strong px-2 py-0.5 rounded text-xs">
                      {TYPE_LABELS[s.type] ?? s.type}
                    </span>
                    {s.needs_review === 1 && (
                      <span className="ml-1.5 text-[10px] text-flag-high">⚠</span>
                    )}
                  </td>
                  <td className="p-3 text-text-muted align-top">{s.organ ?? "—"}</td>
                  <td className="p-3 text-text-muted align-top">{s.facility ?? "—"}</td>
                  <td className="p-3 text-text-faint align-top text-xs">
                    {snippet}{(s.conclusion ?? "").length > 80 ? "…" : ""}
                  </td>
                </ClickableRow>
              );
            })}
          </tbody>
        </table>
      </div>

      {studies.length === 0 && (
        <div className="mt-6 text-sm text-text-faint">Ничего не найдено</div>
      )}
    </>
  );
}
