import Link from "next/link";
import type { Flag } from "@health/shared";
import { FlagPill } from "./FlagPill";

interface HeroCardProps {
  code: string;
  name: string;
  panel: string | null;
  labName: string;
  value: number | null;
  valueText: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: Flag;
  history?: number[];
}

const HERO_BG: Record<Flag, string> = {
  normal:   "radial-gradient(ellipse at top right, #1d2742 0%, #0e1424 70%)",
  low:      "radial-gradient(ellipse at top right, #1e2a40 0%, #0f1424 70%)",
  high:     "radial-gradient(ellipse at top right, #2a1e1a 0%, #0f1424 70%)",
  critical: "radial-gradient(ellipse at top right, #311818 0%, #0f1424 70%)",
};

const HERO_STROKE: Record<Flag, string> = {
  normal: "#6ee7b7",
  low: "#93c5fd",
  high: "#fdba74",
  critical: "#fca5a5",
};

function deviationText(value: number | null, refLow: number | null, refHigh: number | null, flag: Flag): string | null {
  if (value === null) return null;
  if (flag === "low" && refLow !== null) {
    const pct = Math.round(((refLow - value) / refLow) * 100);
    return `на ${pct}% ниже нижней границы`;
  }
  if (flag === "high" && refHigh !== null) {
    const pct = Math.round(((value - refHigh) / refHigh) * 100);
    return `на ${pct}% выше верхней границы`;
  }
  return null;
}

function buildPath(values: number[], w: number, h: number): { line: string; area: string } {
  if (values.length < 2) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => [i * stepX, h - ((v - min) / range) * h] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area };
}

export function HeroCard(props: HeroCardProps) {
  const { code, name, panel, labName, value, valueText, unit, refLow, refHigh, flag, history } = props;
  const displayValue = value !== null ? value : valueText ?? "—";
  const arrow = flag === "low" ? "↓" : flag === "high" ? "↑" : "";
  const dev = deviationText(value, refLow, refHigh, flag);
  const { line, area } = history && history.length >= 2 ? buildPath(history, 800, 56) : { line: "", area: "" };
  const stroke = HERO_STROKE[flag];

  return (
    <Link
      href={`/marker/${code}`}
      className="relative block rounded-2xl border border-border-active p-7 overflow-hidden hover:border-text-faint transition-colors"
      style={{ background: HERO_BG[flag] }}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.08em] uppercase text-text-subtle">{name}</div>
          <div className="text-[11px] italic text-text-faint mt-0.5">
            {panel ? `${panel} · ${labName}` : labName}
          </div>
        </div>
        <FlagPill flag={flag} />
      </div>

      <div className="mt-4 text-[72px] font-semibold leading-none tracking-tight text-text-primary tabular">
        {displayValue}
        {unit && <span className="text-lg font-normal text-text-subtle ml-2">{unit}</span>}
        {arrow && <span className="text-xl ml-3" style={{ color: stroke }}>{arrow}</span>}
      </div>

      <div className="mt-3 text-[13px] text-text-muted">
        Норма <strong className="text-text-primary">{refLow ?? "?"}–{refHigh ?? "?"}</strong>
        {dev && <> · <span style={{ color: stroke }} className="font-medium">{dev}</span></>}
      </div>

      {line && (
        <svg className="mt-4 w-full h-14" viewBox="0 0 800 56" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`hg-${code}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#hg-${code})`} />
          <path d={line} stroke={stroke} strokeWidth="2" fill="none" />
        </svg>
      )}
    </Link>
  );
}
