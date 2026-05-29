import { NextResponse } from "next/server";
import { togglePinned } from "@/lib/queries";

export async function POST(req: Request) {
  const form = await req.formData();
  const code = String(form.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  togglePinned(code);
  return NextResponse.redirect(new URL("/settings", req.url));
}
