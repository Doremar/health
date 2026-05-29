import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { VAULT } from "@health/shared";

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files");
  let count = 0;
  for (const f of files) {
    if (!(f instanceof File)) continue;
    const buf = Buffer.from(await f.arrayBuffer());
    const dest = path.join(VAULT.inbox, f.name);
    fs.writeFileSync(dest, buf);
    count++;
  }
  return NextResponse.redirect(new URL(`/import?uploaded=${count}`, req.url));
}
