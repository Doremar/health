// apps/dashboard/src/app/api/study-delete/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { VAULT } from "@health/shared";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const study = db().prepare("SELECT source_file FROM studies WHERE id = ?").get(id) as { source_file: string } | undefined;
  if (!study) return NextResponse.json({ error: "not found" }, { status: 404 });

  db().prepare("DELETE FROM studies WHERE id = ?").run(id);

  // Удалить markdown в studies/, оригинал в originals/studies/ оставляем для аудита
  const mdName = path.basename(study.source_file).replace(/\.[^.]+$/, ".md");
  const mdPath = path.join(VAULT.root, "studies", mdName);
  if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);

  return NextResponse.redirect(new URL("/studies", req.url));
}
