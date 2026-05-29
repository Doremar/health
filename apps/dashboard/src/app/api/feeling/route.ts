import { NextResponse } from "next/server";
import { addManualFeeling } from "@/lib/queries";

export async function POST(req: Request) {
  const form = await req.formData();
  const mood = Number(form.get("mood"));
  const energy = Number(form.get("energy"));
  const notes = String(form.get("notes") ?? "").trim() || undefined;

  if (![1, 2, 3, 4, 5].includes(mood) || ![1, 2, 3, 4, 5].includes(energy)) {
    return NextResponse.json({ error: "mood and energy must be 1..5" }, { status: 400 });
  }

  addManualFeeling({ mood, energy, notes });
  return NextResponse.redirect(new URL("/feelings", req.url));
}
