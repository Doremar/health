import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { VAULT } from "@health/shared";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rel = url.searchParams.get("path");
  if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });

  const abs = path.resolve(VAULT.root, rel);
  const allowed = [
    VAULT.originals + path.sep,                          // labs: vault/originals/*
    path.join(VAULT.originals, "studies") + path.sep,    // studies: vault/originals/studies/*
  ];
  if (!allowed.some((root) => abs.startsWith(root))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(abs)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const type = ext === ".pdf" ? "application/pdf"
    : (ext === ".jpg" || ext === ".jpeg") ? "image/jpeg"
    : ext === ".png" ? "image/png"
    : "application/octet-stream";
  return new NextResponse(buf, { headers: { "Content-Type": type } });
}
