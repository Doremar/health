import fs from "node:fs";
import { VAULT } from "@health/shared";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const recentLog = fs.existsSync(VAULT.importLog)
    ? fs.readFileSync(VAULT.importLog, "utf8").split("\n").slice(-30).join("\n")
    : "(пусто)";
  const inboxFiles = fs.readdirSync(VAULT.inbox).filter((f) => !f.startsWith("."));
  const quarantineFiles = fs.readdirSync(VAULT.quarantine).filter((f) => !f.startsWith("."));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Импорт</h1>

      <form action="/api/import" method="POST" encType="multipart/form-data" className="rounded-lg border bg-white p-4">
        <label className="block mb-2 font-medium">Загрузить файлы:</label>
        <input type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png" className="block" />
        <button type="submit" className="mt-3 bg-blue-600 text-white rounded px-4 py-2">Загрузить в inbox</button>
      </form>

      <section>
        <h2 className="text-lg font-medium">В очереди inbox ({inboxFiles.length})</h2>
        <ul className="text-sm">{inboxFiles.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Quarantine ({quarantineFiles.length})</h2>
        <ul className="text-sm">{quarantineFiles.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Последние записи в .import.log</h2>
        <pre className="bg-neutral-100 text-xs p-3 rounded overflow-auto">{recentLog}</pre>
      </section>
    </div>
  );
}
