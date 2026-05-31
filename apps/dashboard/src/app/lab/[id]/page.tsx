import { getLab, listLabMarkers } from "@/lib/queries";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ClickableRow } from "@/components/ClickableRow";
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

interface MarkerRow {
  code: string; name: string;
  value: number | null; value_text: string | null; unit: string | null;
  ref_low: number | null; ref_high: number | null; ref_text: string | null;
  flag: Flag;
}

export const dynamic = "force-dynamic";

export default async function LabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lab = getLab(Number(id));
  if (!lab) return notFound();
  const markers = listLabMarkers(lab.id) as MarkerRow[];

  return (
    <>
      <PageHeader
        title={`${lab.panel ? lab.panel + " — " : ""}${lab.lab_name}`}
        meta={lab.date}
      />
      {lab.needs_review === 1 && (
        <div className="-mt-4 mb-5 inline-block bg-flag-high/10 text-flag-high text-xs px-2.5 py-1 rounded-full">
          требует проверки
        </div>
      )}

      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-center font-medium w-1/4">Название</th>
              <th className="p-3 text-center font-medium w-1/4">Значение</th>
              <th className="p-3 text-center font-medium w-1/4">Норма</th>
              <th className="p-3 text-center font-medium w-1/4">Состояние</th>
            </tr>
          </thead>
          <tbody>
            {markers.map((m, i) => (
              <ClickableRow key={i} href={`/marker/${m.code}`}>
                <td className="p-3 text-center text-text-primary">{m.name}</td>
                <td className="p-3 text-center tabular text-text-primary">
                  {m.value ?? m.value_text ?? "—"} <span className="text-text-faint">{m.unit}</span>
                </td>
                <td className="p-3 text-center text-text-faint">
                  {m.ref_low ?? "—"}–{m.ref_high ?? "—"}
                  {m.ref_text && <span className="ml-1">({m.ref_text})</span>}
                </td>
                <td className={`p-3 text-center ${FLAG_COLOR[m.flag]}`}>{FLAG_LABEL[m.flag]}</td>
              </ClickableRow>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-2">
        <a
          href={`/api/file?path=${encodeURIComponent(lab.source_file)}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-card text-flag-low text-xs whitespace-nowrap hover:border-border-active hover:text-text-strong"
        >
          Открыть PDF
        </a>
        <ConfirmDeleteButton
          endpoint="/api/delete-lab"
          fields={{ id: lab.id }}
          confirmText={`Удалить эту сдачу (${lab.lab_name}${lab.panel ? " · " + lab.panel : ""} от ${lab.date})? Все маркеры тоже пропадут.`}
          label="Удалить сдачу"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border-card text-flag-critical text-xs whitespace-nowrap hover:border-flag-critical"
        />
      </div>
    </>
  );
}
