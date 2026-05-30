// apps/dashboard/src/app/api/study-reclassify/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { VAULT } from "@health/shared";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const study = db()
    .prepare("SELECT source_file FROM studies WHERE id = ?")
    .get(id) as { source_file: string } | undefined;
  if (!study) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Переместить оригинал обратно в inbox/
  const abs = path.resolve(VAULT.root, study.source_file);
  if (fs.existsSync(abs)) {
    const dest = path.join(VAULT.inbox, path.basename(abs));
    fs.renameSync(abs, dest);
  }

  // Удалить запись из БД
  db().prepare("DELETE FROM studies WHERE id = ?").run(id);

  // Удалить markdown в studies/
  const mdName = path.basename(study.source_file).replace(/\.[^.]+$/, ".md");
  const mdPath = path.join(VAULT.root, "studies", mdName);
  if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);

  return NextResponse.redirect(new URL("/import?reimport=1", req.url));
}
