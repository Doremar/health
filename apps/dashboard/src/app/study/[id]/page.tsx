// apps/dashboard/src/app/study/[id]/page.tsx
import { getStudy } from "@/lib/queries";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

const TYPE_LABELS: Record<string, string> = {
  ecg: "ЭКГ", holter: "Холтер", smad: "СМАД",
  xray: "Рентген", fluorography: "Флюорография",
  ct: "КТ", mri: "МРТ", usg: "УЗИ", other: "Другое",
};

function flagColor(flag: string | null): string {
  if (flag === "low") return "bg-flag-low/10 text-flag-low";
  if (flag === "high") return "bg-flag-high/10 text-flag-high";
  if (flag === "critical") return "bg-flag-critical/10 text-flag-critical";
  return "bg-flag-normal/10 text-flag-normal";
}

export const dynamic = "force-dynamic";

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = getStudy(Number(id));
  if (!study) return notFound();

  const title = `${TYPE_LABELS[study.type] ?? study.type}${study.organ ? " · " + study.organ : ""}`;
  const meta = `${study.date}${study.facility ? " · " + study.facility : ""}${study.doctor ? " · " + study.doctor : ""}`;

  return (
    <>
      <PageHeader title={title} meta={meta} />
      {study.needs_review === 1 && (
        <div className="-mt-4 mb-5 inline-block bg-flag-high/10 text-flag-high text-xs px-2.5 py-1 rounded-full">
          требует проверки
        </div>
      )}

      {study.conclusion && (
        <>
          <SectionHeader label="Заключение" />
          <div className="bg-bg-surface border border-border-soft rounded-2xl p-5 mb-6 whitespace-pre-line text-text-strong">
            {study.conclusion}
          </div>
        </>
      )}

      {study.diagnoses.length > 0 && (
        <>
          <SectionHeader label="Диагнозы" count={study.diagnoses.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl p-5 mb-6 space-y-2">
            {study.diagnoses.map((d) => (
              <div key={d.id} className="flex items-start gap-2 text-text-strong text-sm">
                <span className="text-text-faint">•</span>
                <span>{d.text}</span>
                {d.icd10 && (
                  <span className="bg-bg-elevated text-text-faint text-xs px-2 py-0.5 rounded-full ml-auto">
                    {d.icd10}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {study.metrics.length > 0 && (
        <>
          <SectionHeader label="Показатели" count={study.metrics.length} />
          <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated text-text-faint">
                <tr>
                  <th className="p-3 text-left font-medium">Показатель</th>
                  <th className="p-3 text-right font-medium">Значение</th>
                  <th className="p-3 text-left font-medium">Норма</th>
                  <th className="p-3 text-center font-medium">Флаг</th>
                </tr>
              </thead>
              <tbody>
                {study.metrics.map((m) => (
                  <tr key={m.id} className="border-t border-border-soft">
                    <td className="p-3 text-text-muted">{m.name}</td>
                    <td className="p-3 text-right tabular text-text-primary">
                      {m.value ?? "—"} <span className="text-text-faint">{m.unit}</span>
                    </td>
                    <td className="p-3 text-text-faint">
                      {m.ref_low ?? "—"}–{m.ref_high ?? "—"}
                    </td>
                    <td className="p-3 text-center">
                      {m.flag && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${flagColor(m.flag)}`}>
                          {m.flag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {study.findings && (
        <>
          <SectionHeader label="Описание" />
          <div className="bg-bg-surface border border-border-soft rounded-2xl p-5 mb-6 whitespace-pre-line text-text-muted text-sm">
            {study.findings}
          </div>
        </>
      )}

      {study.recommendations && (
        <>
          <SectionHeader label="Рекомендации" />
          <div className="bg-bg-surface border border-border-soft rounded-2xl p-5 mb-6 whitespace-pre-line text-text-strong">
            {study.recommendations}
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={`/api/file?path=${encodeURIComponent(study.source_file)}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-card text-flag-low text-xs whitespace-nowrap hover:border-border-active hover:text-text-strong"
        >
          Открыть PDF
        </a>
        <form action="/api/study-reclassify" method="POST" className="inline">
          <input type="hidden" name="id" value={study.id} />
          <input type="hidden" name="target" value="lab" />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-card text-text-faint text-xs whitespace-nowrap hover:border-border-active hover:text-text-strong"
          >
            Это анализ, не исследование <span aria-hidden>→</span>
          </button>
        </form>
        <ConfirmDeleteButton
          endpoint="/api/study-delete"
          fields={{ id: study.id }}
          confirmText={`Удалить это исследование (${TYPE_LABELS[study.type] ?? study.type}${study.organ ? " " + study.organ : ""} от ${study.date})? Диагнозы и показатели тоже пропадут.`}
          label="Удалить исследование"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-card text-flag-critical text-xs whitespace-nowrap hover:border-flag-critical"
        />
      </div>
    </>
  );
}
