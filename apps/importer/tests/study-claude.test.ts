import { describe, it, expect, vi } from "vitest";
import { parseStudyViaClaude } from "../src/pipeline/study-claude.js";

const VALID = JSON.stringify({
  date: "2025-11-25",
  type: "ecg",
  modality: "кардиология",
  organ: "сердце",
  facility: "ГКБ Кончаловского",
  doctor: "Иванова",
  conclusion: "Синусовый ритм. ЧСС 72.",
  findings: null,
  recommendations: null,
  diagnoses: [{ text: "Синусовый ритм", icd10: null }],
  metrics: [{ code: "hr_avg", name: "ЧСС", value: 72, unit: "уд/мин", ref_low: 60, ref_high: 80 }],
  is_study: true,
  confidence: "high",
});

describe("parseStudyViaClaude", () => {
  it("parses valid response", async () => {
    const runner = vi.fn().mockResolvedValueOnce(VALID);
    const r = await parseStudyViaClaude("/tmp/x.pdf", { runner });
    expect(r.type).toBe("ecg");
    expect(r.diagnoses).toHaveLength(1);
    expect(r.metrics[0]!.value).toBe(72);
  });

  it("retries on bad JSON", async () => {
    const runner = vi.fn().mockResolvedValueOnce("nope").mockResolvedValueOnce(VALID);
    const r = await parseStudyViaClaude("/tmp/x.pdf", { runner, maxRetries: 3 });
    expect(r.type).toBe("ecg");
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("throws after maxRetries", async () => {
    const runner = vi.fn().mockResolvedValue("garbage");
    await expect(parseStudyViaClaude("/tmp/x.pdf", { runner, maxRetries: 3 }))
      .rejects.toThrow(/failed after 3/);
  });
});
