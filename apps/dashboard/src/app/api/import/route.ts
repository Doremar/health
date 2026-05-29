import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { VAULT } from "@health/shared";

const PNPM = process.env.PNPM_BIN ?? "/Users/konstantin/Library/pnpm/pnpm";
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

/**
 * Запускает importer для одного файла в фоне (detached, fire-and-forget).
 * stdout/stderr идут в .import.log через сам importer (log.ts использует appendFileSync).
 */
function spawnImport(filePath: string): void {
  const child = spawn(
    PNPM,
    ["--filter", "@health/importer", "exec", "tsx", "src/cli.ts", "import", filePath],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, HEALTH_VAULT_PATH: VAULT.root },
      detached: true,
      stdio: "ignore",
    }
  );
  child.unref();
}

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files");
  const uploaded: string[] = [];

  for (const f of files) {
    if (!(f instanceof File)) continue;
    const buf = Buffer.from(await f.arrayBuffer());
    const dest = path.join(VAULT.inbox, f.name);
    fs.writeFileSync(dest, buf);
    uploaded.push(dest);
  }

  // Запускаем claude-парсинг параллельно, не ждём
  for (const filePath of uploaded) {
    spawnImport(filePath);
  }

  return NextResponse.redirect(new URL(`/import?uploaded=${uploaded.length}&processing=1`, req.url));
}
