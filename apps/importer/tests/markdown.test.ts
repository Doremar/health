import { describe, it, expect } from "vitest";
import { renderLabMarkdown } from "../src/pipeline/markdown.js";

describe("renderLabMarkdown", () => {
  it("renders frontmatter, abnormal block and full table", () => {
    const md = renderLabMarkdown({
      lab: {
        date: "2026-03-15",
        lab_name: "Invitro",
        panel: "биохимия",
        source_file: "originals/2026-03-15-invitro.pdf",
      },
      markers: [
        {
          code: "ferritin",
          name: "Ферритин",
          value: 45,
          value_text: null,
          unit: "ng/ml",
          ref_low: 30,
          ref_high: 400,
          ref_text: null,
          flag: "normal",
        },
        {
          code: "vitamin_d_25oh",
          name: "Витамин D",
          value: 18,
          value_text: null,
          unit: "ng/ml",
          ref_low: 30,
          ref_high: 100,
          ref_text: null,
          flag: "low",
        },
      ],
    });

    expect(md).toMatch(/^---\n/);
    expect(md).toContain("date: 2026-03-15");
    expect(md).toContain("lab: Invitro");
    expect(md).toContain("type: lab-result");
    expect(md).toContain("tags: [health, labs, invitro]");
    expect(md).toContain("abnormal_markers: [vitamin_d_25oh]");
    expect(md).toContain("## ⚠ Отклонения");
    expect(md).toContain("Витамин D");
    expect(md).toContain("## Все показатели");
    expect(md).toContain("Ферритин");
    expect(md).toContain("../originals/2026-03-15-invitro.pdf");
  });

  it("skips abnormal section when no abnormal markers", () => {
    const md = renderLabMarkdown({
      lab: {
        date: "2026-03-15",
        lab_name: "KDL",
        panel: null,
        source_file: "originals/x.pdf",
      },
      markers: [
        {
          code: "ferritin",
          name: "Ферритин",
          value: 45,
          value_text: null,
          unit: "ng/ml",
          ref_low: 30,
          ref_high: 400,
          ref_text: null,
          flag: "normal",
        },
      ],
    });
    expect(md).not.toContain("Отклонения");
    expect(md).toContain("abnormal_markers: []");
  });
});
