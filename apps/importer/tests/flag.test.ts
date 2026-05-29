import { describe, it, expect } from "vitest";
import { computeFlag } from "../src/pipeline/flag.js";

describe("computeFlag", () => {
  it("normal when value within range", () => {
    expect(computeFlag(50, 30, 100)).toBe("normal");
  });

  it("low when value below ref_low", () => {
    expect(computeFlag(20, 30, 100)).toBe("low");
  });

  it("high when value above ref_high", () => {
    expect(computeFlag(150, 30, 100)).toBe("high");
  });

  it("normal on exact boundaries", () => {
    expect(computeFlag(30, 30, 100)).toBe("normal");
    expect(computeFlag(100, 30, 100)).toBe("normal");
  });

  it("normal when no refs (null)", () => {
    expect(computeFlag(50, null, null)).toBe("normal");
  });

  it("normal when value is null", () => {
    expect(computeFlag(null, 30, 100)).toBe("normal");
  });

  it("only ref_low provided", () => {
    expect(computeFlag(20, 30, null)).toBe("low");
    expect(computeFlag(200, 30, null)).toBe("normal");
  });

  it("only ref_high provided", () => {
    expect(computeFlag(20, null, 100)).toBe("normal");
    expect(computeFlag(200, null, 100)).toBe("high");
  });
});
