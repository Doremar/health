import { NextResponse } from "next/server";
import { setNutritionTarget, deleteNutritionLog } from "@/lib/queries";

export async function POST(req: Request) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  if (action === "delete") {
    const id = Number(form.get("id"));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    deleteNutritionLog(id);
    return NextResponse.redirect(new URL("/nutrition", req.url));
  }

  if (action === "update_target") {
    const daily_calories = Number(form.get("daily_calories"));
    const protein_g = Number(form.get("protein_g"));
    const fat_g = Number(form.get("fat_g"));
    const carbs_g = Number(form.get("carbs_g"));
    if ([daily_calories, protein_g, fat_g, carbs_g].some((n) => !Number.isFinite(n) || n <= 0)) {
      return NextResponse.json({ error: "все 4 значения должны быть положительными числами" }, { status: 400 });
    }
    setNutritionTarget({ daily_calories, protein_g, fat_g, carbs_g });
    return NextResponse.redirect(new URL("/nutrition", req.url));
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
