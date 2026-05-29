import fs from "node:fs";
import { VAULT } from "@health/shared";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { ImportDropZone } from "@/components/ImportDropZone";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const recentLog = fs.existsSync(VAULT.importLog)
    ? fs.readFileSync(VAULT.importLog, "utf8").split("\n").filter(Boolean).slice(-30).join("\n")
    : "(пусто)";
  const inboxFiles = fs.readdirSync(VAULT.inbox).filter((f) => !f.startsWith("."));
  const quarantineFiles = fs.readdirSync(VAULT.quarantine).filter((f) => !f.startsWith("."));
  const processing = inboxFiles.length > 0;

  return (
    <>
      <PageHeader title="Импорт" meta={`inbox: ${inboxFiles.length} · quarantine: ${quarantineFiles.length}`} />

      {processing && (
        <>
          <AutoRefresh intervalMs={10000} />
          <div className="mb-5 flex items-center gap-3 bg-flag-low/10 border border-flag-low/30 text-flag-low text-sm rounded-xl px-4 py-3">
            <span className="inline-block w-2 h-2 rounded-full bg-flag-low animate-pulse" />
            <span>
              Claude обрабатывает {inboxFiles.length} {inboxFiles.length === 1 ? "файл" : "файла"}.
              {" "}~30-90 сек на каждый. Страница обновляется автоматически каждые 10 сек.
            </span>
          </div>
        </>
      )}

      <ImportDropZone />

      {inboxFiles.length > 0 && (
        <>
          <SectionHeader label="В обработке" count={inboxFiles.length} />
          <ul className="bg-bg-surface border border-border-soft rounded-xl p-4 text-sm space-y-1">
            {inboxFiles.map((f) => (
              <li key={f} className="text-text-muted flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-flag-low animate-pulse" />
                {f}
              </li>
            ))}
          </ul>
        </>
      )}

      {quarantineFiles.length > 0 && (
        <>
          <SectionHeader label="Quarantine" count={quarantineFiles.length} />
          <ul className="bg-bg-surface border border-border-soft rounded-xl p-4 text-sm space-y-1">
            {quarantineFiles.map((f) => (
              <li key={f} className="text-text-muted">{f}</li>
            ))}
          </ul>
        </>
      )}

      <SectionHeader label="Последние записи .import.log" />
      <pre className="bg-bg-surface border border-border-soft rounded-xl p-4 text-[11px] text-text-faint overflow-x-auto whitespace-pre-wrap">
        {recentLog}
      </pre>
    </>
  );
}
