import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { VAULT, CLAUDE_BIN } from "@health/shared";
import { logNutrition } from "./db.js";
import type { Telegraf } from "telegraf";

const NUTRITION_DIR = path.join(VAULT.root, "nutrition");

export interface ParsedFood {
  description: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

function buildVisionPrompt(imagePath: string): string {
  return `Ты — диетолог-аналитик. Прочитай изображение еды с помощью инструмента Read по абсолютному пути:
${imagePath}

Изучи что на фото и оцени КБЖУ ВСЕЙ порции (а не на 100г).

Верни СТРОГО JSON по схеме:

{
  "description": "омлет с овощами и сыром, около 250 г",
  "calories": 380,
  "protein_g": 22,
  "fat_g": 28,
  "carbs_g": 8,
  "fiber_g": 2,
  "confidence": "high" | "medium" | "low"
}

Правила:
- Все числа — реалистичная оценка для ВСЕЙ ВИДИМОЙ порции (целая тарелка).
- Если порция явно очень большая/маленькая — учти.
- description: короткое название + примерный вес.
- confidence: "high" если еда чётко видна и опознана; "medium" если есть сомнения; "low" если плохо видно или сложное блюдо.
- Если на фото НЕ еда — confidence: "low", calories/proteins/fats/carbs: null, description: "не еда: <что>".

Выведи ТОЛЬКО JSON. Никаких пояснений до или после. Никаких markdown-фенсов.`;
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function runClaudeVision(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_BIN, [
      "-p",
      "--output-format", "text",
      "--permission-mode", "bypassPermissions",
      "--add-dir", VAULT.root,
      "--allowedTools", "Read",
    ], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout.on("data", (c) => { out += c.toString(); });
    proc.stderr.on("data", (c) => { err += c.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`claude exited ${code}: ${err}`));
      else resolve(out);
    });
    proc.on("error", reject);
    proc.stdin!.write(prompt);
    proc.stdin!.end();
  });
}

function parseFood(raw: string): ParsedFood | null {
  try {
    const cleaned = stripFences(raw);
    const obj = JSON.parse(cleaned);
    if (typeof obj.description !== "string") return null;
    return {
      description: obj.description,
      calories: typeof obj.calories === "number" ? obj.calories : null,
      protein_g: typeof obj.protein_g === "number" ? obj.protein_g : null,
      fat_g: typeof obj.fat_g === "number" ? obj.fat_g : null,
      carbs_g: typeof obj.carbs_g === "number" ? obj.carbs_g : null,
      fiber_g: typeof obj.fiber_g === "number" ? obj.fiber_g : null,
      confidence: ["high", "medium", "low"].includes(obj.confidence) ? obj.confidence : "low",
      notes: typeof obj.notes === "string" ? obj.notes : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Скачивает фото из Telegram, сохраняет в vault/nutrition/, запускает claude vision,
 * сохраняет результат в БД. Возвращает результат (или null если совсем не распарсилось).
 */
export async function processFoodPhoto(
  telegraf: Telegraf,
  fileId: string,
  chatId: number,
  caption?: string,
): Promise<{ logId: number; parsed: ParsedFood; imagePath: string } | { error: string }> {
  // 1. Получить URL файла
  const link = await telegraf.telegram.getFileLink(fileId);
  // 2. Скачать
  const response = await fetch(link.toString());
  if (!response.ok) {
    return { error: `Не смог скачать фото: HTTP ${response.status}` };
  }
  const buf = Buffer.from(await response.arrayBuffer());

  // 3. Сохранить
  fs.mkdirSync(NUTRITION_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${ts}.jpg`;
  const imagePath = path.join(NUTRITION_DIR, fileName);
  fs.writeFileSync(imagePath, buf);

  // 4. Запустить vision-парсинг
  let raw: string;
  try {
    raw = await runClaudeVision(buildVisionPrompt(imagePath) + (caption ? `\n\nПодсказка пользователя: ${caption}` : ""));
  } catch (e) {
    return { error: `Claude vision failed: ${(e as Error).message}` };
  }

  // 5. Парсинг
  const parsed = parseFood(raw);
  if (!parsed) {
    return { error: `Не смог распарсить ответ Claude: ${raw.slice(0, 200)}` };
  }

  // 6. Сохранить в БД (даже если confidence: low — но без КБЖУ если null'и)
  const logId = logNutrition({
    chat_id: chatId,
    description: parsed.description,
    image_path: path.relative(VAULT.root, imagePath),
    calories: parsed.calories ?? undefined,
    protein_g: parsed.protein_g ?? undefined,
    fat_g: parsed.fat_g ?? undefined,
    carbs_g: parsed.carbs_g ?? undefined,
    fiber_g: parsed.fiber_g ?? undefined,
    source: "telegram_photo",
    confidence: parsed.confidence,
    notes: caption,
    raw_response: raw,
  });

  return { logId, parsed, imagePath };
}
