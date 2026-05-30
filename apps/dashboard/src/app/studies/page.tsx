// apps/dashboard/src/app/studies/page.tsx
import { listAllStudies, searchStudies } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";

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

      <form className="flex gap-3 items-end mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">Поиск</label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            className="w-full bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-active"
            placeholder="орган, врач, диагноз, фраза из заключения"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">Тип</label>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
          >
            <option value="">все</option>
            {knownTypes.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-text-faint mb-1">Модальность</label>
          <select
            name="modality"
            defaultValue={sp.modality ?? ""}
            className="bg-bg-surface border border-border-card rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-border-active"
          >
            <option value="">все</option>
            {knownMods.map((m) => (
              <option key={m} value={m}>{MODALITY_LABELS[m] ?? m}</option>
            ))}
          </select>
        </div>
        <button className="bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium">Применить</button>
      </form>

      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Дата</th>
              <th className="p-3 text-left font-medium">Тип</th>
              <th className="p-3 text-left font-medium">Орган</th>
              <th className="p-3 text-left font-medium">Лаборатория</th>
              <th className="p-3 text-left font-medium">Заключение</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {studies.map((s) => {
              const snippet = (s.conclusion ?? "").slice(0, 80);
              return (
                <tr key={s.id} className="border-t border-border-soft hover:bg-bg-elevated/40 transition-colors">
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
                  <td className="p-3 align-top">
                    <Link href={`/study/${s.id}`} className="text-flag-low hover:underline text-xs whitespace-nowrap">
                      открыть →
                    </Link>
                  </td>
                </tr>
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
