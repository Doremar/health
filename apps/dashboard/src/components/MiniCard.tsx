import Link from "next/link";
import type { Flag } from "@health/shared";
import { FlagDot } from "./FlagPill";

interface MiniCardProps {
  code: string;
  name: string;
  panel: string | null;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: Flag;
  sparkline?: number[];
}

function buildSparkPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length < 2) return "";
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const stepX = w / (valid.length - 1);
  return valid
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const FLAG_STROKE: Record<Flag, string> = {
  normal: "var(--flag-normal)",
  low: "var(--flag-low)",
  high: "var(--flag-high)",
  critical: "var(--flag-critical)",
};

export function MiniCard(props: MiniCardProps) {
  const { code, name, panel, value, valueText, unit, refLow, refHigh, flag, sparkline } = props;
  const displayValue = value !== null ? value : valueText ?? "—";
  const path = sparkline ? buildSparkPath(sparkline, 100, 28) : "";

  return (
    <Link
      href={`/marker/${code}`}
      className="relative block bg-gradient-to-b from-bg-elevated to-bg-surface border border-border-card rounded-xl p-4 hover:border-border-active transition-colors"
    >
      <span className="absolute top-3.5 right-3.5">
        <FlagDot flag={flag} />
      </span>
      <div className="text-[11px] font-medium tracking-[0.06em] uppercase text-text-faint pr-4 leading-tight">
        {name}
      </div>
      {panel && (
        <div className="text-[10px] italic text-text-disabled mt-0.5">{panel}</div>
      )}
      <div className="mt-3.5 text-[30px] font-semibold leading-none tracking-tight text-text-primary tabular">
        {displayValue}
        {unit && <span className="text-xs font-normal text-text-faint ml-1">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11px] text-text-faint">
        норма {refLow ?? "?"}–{refHigh ?? "?"}
      </div>
      {path && (
        <svg className="mt-2.5 w-full h-7 opacity-80" viewBox="0 0 100 28" preserveAspectRatio="none">
          <path d={path} stroke={FLAG_STROKE[flag]} strokeWidth="1.5" fill="none" />
        </svg>
      )}
    </Link>
  );
}
