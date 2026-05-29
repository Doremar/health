import fs from "node:fs";
import { VAULT } from "@health/shared";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { ImportDropZone } from "@/components/ImportDropZone";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const recentLog = fs.existsSync(VAULT.importLog)
    ? fs.readFileSync(VAULT.importLog, "utf8").split("\n").filter(Boolean).slice(-30).join("\n")
    : "(пусто)";
  const inboxFiles = fs.readdirSync(VAULT.inbox).filter((f) => !f.startsWith("."));
  const quarantineFiles = fs.readdirSync(VAULT.quarantine).filter((f) => !f.startsWith("."));

  return (
    <>
      <PageHeader title="Импорт" meta={`inbox: ${inboxFiles.length} · quarantine: ${quarantineFiles.length}`} />

      <ImportDropZone />

      {inboxFiles.length > 0 && (
        <>
          <SectionHeader label="В очереди inbox" count={inboxFiles.length} />
          <ul className="bg-bg-surface border border-border-soft rounded-xl p-4 text-sm space-y-1">
            {inboxFiles.map((f) => (
              <li key={f} className="text-text-muted">{f}</li>
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
