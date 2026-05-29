import { spawn } from "node:child_process";
import { CLAUDE_BIN, ParseResult, ParseResultSchema, VAULT } from "@health/shared";
import { buildParseLabPrompt } from "../prompts/parse-lab.js";

export interface ParseOptions {
  runner?: (prompt: string) => Promise<string>;
  maxRetries?: number;
}

function defaultRunner(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_BIN, [
      "-p",
      "--output-format", "text",
      "--permission-mode", "bypassPermissions",
      "--add-dir", VAULT.root,
      "--allowedTools", "Read",
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });
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

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function parseLabViaClaude(
  filePath: string,
  opts: ParseOptions = {},
): Promise<ParseResult> {
  const runner = opts.runner ?? defaultRunner;
  const maxRetries = opts.maxRetries ?? 3;
  const basePrompt = buildParseLabPrompt(filePath);
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = attempt === 1
      ? basePrompt
      : `${basePrompt}\n\nПредыдущий ответ не прошёл валидацию: ${lastError}. Выведи ТОЛЬКО валидный JSON.`;

    const raw = await runner(prompt);
    const cleaned = stripFences(raw);

    try {
      const parsed = JSON.parse(cleaned);
      return ParseResultSchema.parse(parsed);
    } catch (e) {
      lastError = (e as Error).message.slice(0, 200);
      continue;
    }
  }

  throw new Error(`Claude parse failed after ${maxRetries} retries: ${lastError}`);
}
