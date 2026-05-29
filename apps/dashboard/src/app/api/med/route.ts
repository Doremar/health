import { NextResponse } from "next/server";
import { addMedRecord, deactivateMedRecord } from "@/lib/queries";
import { parseScheduleToCron } from "@health/shared";

export async function POST(req: Request) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "create");

  if (action === "deactivate") {
    const id = Number(form.get("id"));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    deactivateMedRecord(id);
    return NextResponse.redirect(new URL("/meds", req.url));
  }

  // action === "create"
  const name = String(form.get("name") ?? "").trim();
  const dose = String(form.get("dose") ?? "").trim() || undefined;
  const scheduleHint = String(form.get("schedule_hint") ?? "").trim() || undefined;

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const cron = scheduleHint ? parseScheduleToCron(scheduleHint) : null;

  addMedRecord({
    name,
    dose,
    schedule_hint: scheduleHint,
    schedule_cron: cron ?? undefined,
  });

  return NextResponse.redirect(new URL("/meds", req.url));
}
