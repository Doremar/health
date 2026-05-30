import { describe, it, expect } from "vitest";
import { renderStudyMarkdown } from "../src/pipeline/study-markdown.js";

describe("renderStudyMarkdown", () => {
  it("renders frontmatter, conclusion, diagnoses, metrics", () => {
    const md = renderStudyMarkdown({
      study: {
        date: "2025-11-25",
        type: "ecg",
        modality: "кардиология",
        organ: "сердце",
        facility: "ГКБ",
        doctor: "Иванова",
        conclusion: "Норма",
        findings: "Ритм синусовый",
        recommendations: "Контроль через год",
        source_file: "originals/studies/2025-11-25-ecg.pdf",
      },
      diagnoses: [{ text: "Синусовый ритм", icd10: null }],
      metrics: [{ code: "hr_avg", name: "ЧСС", value: 72, unit: "уд/мин",
                  ref_low: 60, ref_high: 80, flag: "normal" }],
    });
    expect(md).toMatch(/^---\n/);
    expect(md).toContain("date: 2025-11-25");
    expect(md).toContain("type: ecg");
    expect(md).toContain("tags: [health, studies, ecg]");
    expect(md).toContain("## Заключение");
    expect(md).toContain("Норма");
    expect(md).toContain("## Диагнозы");
    expect(md).toContain("Синусовый ритм");
    expect(md).toContain("## Показатели");
    expect(md).toContain("ЧСС");
    expect(md).toContain("../originals/studies/2025-11-25-ecg.pdf");
  });

  it("omits sections when empty", () => {
    const md = renderStudyMarkdown({
      study: {
        date: "2025-11-25", type: "ct", modality: "лучевая", organ: "головной мозг",
        facility: null, doctor: null, conclusion: "Без патологии",
        findings: null, recommendations: null,
        source_file: "originals/studies/x.pdf",
      },
      diagnoses: [],
      metrics: [],
    });
    expect(md).not.toContain("## Диагнозы");
    expect(md).not.toContain("## Показатели");
    expect(md).not.toContain("## Рекомендации");
  });
});
