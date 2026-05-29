import fs from "node:fs";
import { VAULT } from "@health/shared";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { Upload } from "lucide-react";

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

      <form action="/api/import" method="POST" encType="multipart/form-data">
        <label className="block">
          <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
          <div className="bg-bg-surface border-2 border-dashed border-border-card rounded-2xl p-10 text-center cursor-pointer hover:border-border-active transition-colors">
            <Upload size={32} className="mx-auto text-text-faint mb-3" />
            <div className="text-text-strong text-sm font-medium">Перетащи PDF / фото или клик чтобы выбрать</div>
            <div className="text-text-faint text-xs mt-1">Поддерживаются PDF, JPG, PNG. До 10 файлов разом.</div>
          </div>
        </label>
        <button type="submit" className="mt-3 bg-flag-low text-bg-page rounded-md px-4 py-2 text-sm font-medium">
          Загрузить в inbox
        </button>
      </form>

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
