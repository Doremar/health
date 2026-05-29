import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { VAULT } from "@health/shared";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const lab = db().prepare("SELECT source_file FROM labs WHERE id = ?").get(id) as { source_file: string } | undefined;
  if (!lab) return NextResponse.json({ error: "not found" }, { status: 404 });

  db().prepare("DELETE FROM labs WHERE id = ?").run(id);

  // Delete markdown (keep original in originals/ for audit)
  const mdName = path.basename(lab.source_file).replace(/\.[^.]+$/, ".md");
  const mdPath = path.join(VAULT.labs, mdName);
  if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);

  return NextResponse.redirect(new URL("/archive", req.url));
}
