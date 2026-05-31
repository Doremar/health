import type { Flag } from "@health/shared";

interface Props {
  value: number | null;
  refLow: number | null;
  refHigh: number | null;
  flag: Flag;
}

const FLAG_COLOR: Record<Flag, string> = {
  normal: "var(--flag-normal)",
  low: "var(--flag-low)",
  high: "var(--flag-high)",
  critical: "var(--flag-critical)",
};

const LOW_FILL = "rgba(147, 197, 253, 0.22)";   // flag-low
const NORM_FILL = "rgba(110, 231, 183, 0.34)";  // flag-normal
const HIGH_FILL = "rgba(253, 186, 116, 0.22)";  // flag-high

/**
 * Горизонтальная шкала маркера: показывает все три зоны (ниже нормы / норма /
 * выше нормы) единой полосой и текущее значение точкой над ней.
 *
 * Не рендерится, если нет ни границ нормы, ни числового value
 * (например для маркеров типа "обнаружено / не обнаружено").
 */
export function RangeBar({ value, refLow, refHigh, flag }: Props) {
  if (refLow == null && refHigh == null) return null;
  if (value == null) return null;

  // Domain
  const all = [refLow, refHigh, value].filter((v): v is number => v != null);
  let minD = Math.min(...all);
  let maxD = Math.max(...all);
  if (minD === maxD) {
    const c = minD;
    const spread = Math.abs(c) * 0.5 + 1;
    minD = c - spread;
    maxD = c + spread;
  }
  const pad = (maxD - minD) * 0.20;
  minD -= pad;
  maxD += pad;
  const span = maxD - minD;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - minD) / span) * 100));

  // Границы зон в %
  const lowEnd = refLow != null ? pct(refLow) : 0;     // конец зоны "ниже нормы"
  const highStart = refHigh != null ? pct(refHigh) : 100; // начало зоны "выше нормы"

  // Собираем градиент полосы как stops по краям
  const stops: string[] = [];
  if (refLow != null) {
    stops.push(`${LOW_FILL} 0%`, `${LOW_FILL} ${lowEnd}%`);
    stops.push(`${NORM_FILL} ${lowEnd}%`);
  } else {
    stops.push(`${NORM_FILL} 0%`);
  }
  if (refHigh != null) {
    stops.push(`${NORM_FILL} ${highStart}%`, `${HIGH_FILL} ${highStart}%`, `${HIGH_FILL} 100%`);
  } else {
    stops.push(`${NORM_FILL} 100%`);
  }
  const gradient = `linear-gradient(to right, ${stops.join(", ")})`;

  const dotPct = pct(value);
  const color = FLAG_COLOR[flag];

  return (
    <div className="relative w-full h-8 mt-2.5">
      {/* Полоса со всеми зонами */}
      <div
        className="absolute left-0 right-0 bottom-0 h-3 rounded-md"
        style={{ background: gradient }}
      />
      {/* Vertical stick */}
      <div
        className="absolute bottom-0 w-[2px] h-3 -translate-x-1/2"
        style={{ left: `${dotPct}%`, background: color }}
      />
      {/* Dot */}
      <div
        className="absolute w-4 h-4 rounded-full -translate-x-1/2 shadow-md"
        style={{
          left: `${dotPct}%`,
          top: 0,
          background: color,
          boxShadow: `0 0 0 2px var(--bg-surface), 0 0 12px ${color}55`,
        }}
      />
    </div>
  );
}
