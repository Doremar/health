import { getLab, listLabMarkers } from "@/lib/queries";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { FlagPill } from "@/components/FlagPill";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import Link from "next/link";
import type { Flag } from "@health/shared";

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
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-faint">
            <tr>
              <th className="p-3 text-left font-medium">Код</th>
              <th className="p-3 text-left font-medium">Название</th>
              <th className="p-3 text-right font-medium">Значение</th>
              <th className="p-3 text-left font-medium">Норма</th>
              <th className="p-3 text-center font-medium">Флаг</th>
            </tr>
          </thead>
          <tbody>
            {markers.map((m, i) => (
              <tr key={i} className="border-t border-border-soft">
                <td className="p-3">
                  <Link href={`/marker/${m.code}`} className="text-flag-low hover:underline">{m.code}</Link>
                </td>
                <td className="p-3 text-text-muted">{m.name}</td>
                <td className="p-3 text-right tabular text-text-primary">
                  {m.value ?? m.value_text ?? "—"} <span className="text-text-faint">{m.unit}</span>
                </td>
                <td className="p-3 text-text-faint">
                  {m.ref_low ?? "—"}–{m.ref_high ?? "—"}
                  {m.ref_text && <span className="ml-1">({m.ref_text})</span>}
                </td>
                <td className="p-3 text-center"><FlagPill flag={m.flag} size="sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-5 text-sm">
        <a
          href={`/api/file?path=${encodeURIComponent(lab.source_file)}`}
          className="text-flag-low hover:underline"
        >
          Открыть PDF
        </a>
        <ConfirmDeleteButton
          endpoint="/api/delete-lab"
          fields={{ id: lab.id }}
          confirmText={`Удалить эту сдачу (${lab.lab_name}${lab.panel ? " · " + lab.panel : ""} от ${lab.date})? Все маркеры тоже пропадут.`}
          label="Удалить сдачу"
          className="text-flag-critical hover:underline"
        />
      </div>
    </>
  );
}
