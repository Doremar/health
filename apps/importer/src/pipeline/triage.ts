import { spawn } from "node:child_process";
import { CLAUDE_BIN, VAULT, TriageResultSchema, type TriageResult } from "@health/shared";
import { buildTriagePrompt } from "../prompts/triage.js";

interface Opts {
  runner?: (prompt: string) => Promise<string>;
  maxRetries?: number;
}

function defaultRunner(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(CLAUDE_BIN, [
      "-p", "--output-format", "text",
      "--permission-mode", "bypassPermissions",
      "--add-dir", VAULT.root,
      "--allowedTools", "Read",
    ], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    proc.stdout.on("data", (c) => { out += c.toString(); });
    proc.stderr.on("data", (c) => { err += c.toString(); });
    proc.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(`claude exited ${code}: ${err}`)));
    proc.on("error", reject);
    proc.stdin!.write(prompt);
    proc.stdin!.end();
  });
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function triageViaClaude(filePath: string, opts: Opts = {}): Promise<TriageResult> {
  const runner = opts.runner ?? defaultRunner;
  const maxRetries = opts.maxRetries ?? 3;
  const basePrompt = buildTriagePrompt(filePath);
  let lastErr = "";
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = attempt === 1 ? basePrompt
      : `${basePrompt}\n\nПредыдущий ответ не прошёл валидацию: ${lastErr}. ТОЛЬКО валидный JSON.`;
    const raw = await runner(prompt);
    try {
      return TriageResultSchema.parse(JSON.parse(stripFences(raw)));
    } catch (e) {
      lastErr = (e as Error).message.slice(0, 200);
    }
  }
  throw new Error(`Triage failed after ${maxRetries} retries: ${lastErr}`);
}
