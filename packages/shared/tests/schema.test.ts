import { describe, it, expect } from "vitest";
import { ParseResultSchema } from "../src/schema.js";

describe("ParseResultSchema", () => {
  it("accepts a valid result", () => {
    const data = {
      date: "2026-03-15",
      lab_name: "Invitro",
      panel: "биохимия",
      markers: [
        {
          name: "Ферритин",
          value: 45,
          value_text: null,
          unit: "ng/ml",
          ref_low: 30,
          ref_high: 400,
          ref_text: null,
        },
      ],
      is_lab_result: true,
      confidence: "high",
    };
    expect(ParseResultSchema.parse(data)).toEqual(data);
  });

  it("rejects bad date format", () => {
    const bad = {
      date: "15.03.2026",
      lab_name: "Invitro",
      panel: null,
      markers: [],
      is_lab_result: true,
      confidence: "high",
    };
    expect(() => ParseResultSchema.parse(bad)).toThrow();
  });

  it("rejects invalid confidence", () => {
    const bad = {
      date: "2026-03-15",
      lab_name: "Invitro",
      panel: null,
      markers: [],
      is_lab_result: true,
      confidence: "very-sure",
    };
    expect(() => ParseResultSchema.parse(bad)).toThrow();
  });
});
