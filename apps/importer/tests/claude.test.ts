import { describe, it, expect, vi } from "vitest";
import { parseLabViaClaude } from "../src/pipeline/claude.js";

describe("parseLabViaClaude", () => {
  it("validates and returns ParseResult on first valid response", async () => {
    const runner = vi.fn().mockResolvedValueOnce(JSON.stringify({
      date: "2026-03-15",
      lab_name: "Invitro",
      panel: "биохимия",
      markers: [{
        name: "Ферритин",
        value: 45,
        value_text: null,
        unit: "ng/ml",
        ref_low: 30,
        ref_high: 400,
        ref_text: null,
      }],
      is_lab_result: true,
      confidence: "high",
    }));

    const result = await parseLabViaClaude("/tmp/fake.pdf", { runner, maxRetries: 3 });
    expect(result.lab_name).toBe("Invitro");
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("retries on invalid JSON, then succeeds", async () => {
    const runner = vi.fn()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce(JSON.stringify({
        date: "2026-03-15",
        lab_name: "KDL",
        panel: null,
        markers: [],
        is_lab_result: true,
        confidence: "medium",
      }));

    const result = await parseLabViaClaude("/tmp/fake.pdf", { runner, maxRetries: 3 });
    expect(result.lab_name).toBe("KDL");
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("throws after maxRetries failures", async () => {
    const runner = vi.fn().mockResolvedValue("garbage");
    await expect(
      parseLabViaClaude("/tmp/fake.pdf", { runner, maxRetries: 3 }),
    ).rejects.toThrow(/failed after 3/);
    expect(runner).toHaveBeenCalledTimes(3);
  });

  it("strips markdown code fences if present", async () => {
    const runner = vi.fn().mockResolvedValueOnce("```json\n" + JSON.stringify({
      date: "2026-03-15",
      lab_name: "CMD",
      panel: null,
      markers: [],
      is_lab_result: true,
      confidence: "high",
    }) + "\n```");

    const result = await parseLabViaClaude("/tmp/fake.pdf", { runner, maxRetries: 3 });
    expect(result.lab_name).toBe("CMD");
  });
});
