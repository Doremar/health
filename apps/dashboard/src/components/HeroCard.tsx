import Link from "next/link";
import type { Flag } from "@health/shared";
import { FlagPill } from "./FlagPill";
import { RangeBar } from "./RangeBar";

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

export function HeroCard(props: HeroCardProps) {
  const { code, name, panel, labName, value, valueText, unit, refLow, refHigh, flag } = props;
  const displayValue = value !== null ? value : valueText ?? "—";
  const arrow = flag === "low" ? "↓" : flag === "high" ? "↑" : "";
  const dev = deviationText(value, refLow, refHigh, flag);
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

      <RangeBar value={value} refLow={refLow} refHigh={refHigh} flag={flag} />
    </Link>
  );
}
