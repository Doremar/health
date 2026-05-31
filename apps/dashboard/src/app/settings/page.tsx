import { listAllMarkerCodes, getPinnedOverrides } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { MarkerSearchTable } from "@/components/MarkerSearchTable";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const all = listAllMarkerCodes();
  const overrides = getPinnedOverrides();

  const rows = all.map((m) => ({
    code: m.code,
    name: m.name,
    count: m.count,
    inWhitelist: false,
    overridden: overrides.has(m.code),
  }));

  return (
    <>
      <PageHeader title="Настройки" meta={`${all.length} известных маркеров`} />
      <SectionHeader label="Закреплённые маркеры (на главной)" />
      <div className="text-sm text-text-faint mb-4">
        Отмеченные «● закреплён» маркеры всегда показываются в секции «В фокусе» на главной, даже если значение в норме.
      </div>
      <MarkerSearchTable rows={rows} />
    </>
  );
}
