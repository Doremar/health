import type { Flag } from "@health/shared";

export function computeFlag(
  value: number | null,
  refLow: number | null,
  refHigh: number | null,
): Flag {
  if (value === null) return "normal";
  if (refLow !== null && value < refLow) return "low";
  if (refHigh !== null && value > refHigh) return "high";
  return "normal";
}
