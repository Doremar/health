import { describe, it, expect, vi } from "vitest";
import { triageViaClaude } from "../src/pipeline/triage.js";

describe("triageViaClaude", () => {
  it("parses valid response", async () => {
    const runner = vi.fn().mockResolvedValueOnce(
      JSON.stringify({ kind: "lab", confidence: "high" })
    );
    const r = await triageViaClaude("/tmp/x.pdf", { runner });
    expect(r.kind).toBe("lab");
    expect(r.confidence).toBe("high");
  });

  it("retries on invalid JSON", async () => {
    const runner = vi.fn()
      .mockResolvedValueOnce("garbage")
      .mockResolvedValueOnce(JSON.stringify({ kind: "study", confidence: "medium" }));
    const r = await triageViaClaude("/tmp/x.pdf", { runner, maxRetries: 3 });
    expect(r.kind).toBe("study");
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("throws after 3 retries", async () => {
    const runner = vi.fn().mockResolvedValue("nope");
    await expect(triageViaClaude("/tmp/x.pdf", { runner, maxRetries: 3 }))
      .rejects.toThrow(/failed after 3/);
  });

  it("strips markdown fences", async () => {
    const runner = vi.fn().mockResolvedValueOnce(
      "```json\n" + JSON.stringify({ kind: "other", confidence: "low" }) + "\n```"
    );
    const r = await triageViaClaude("/tmp/x.pdf", { runner });
    expect(r.kind).toBe("other");
  });
});
