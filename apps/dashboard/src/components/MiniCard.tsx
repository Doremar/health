import Link from "next/link";
import type { Flag } from "@health/shared";
import { FlagDot } from "./FlagPill";
import { RangeBar } from "./RangeBar";

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
}

export function MiniCard(props: MiniCardProps) {
  const { code, name, panel, value, valueText, unit, refLow, refHigh, flag } = props;
  const displayValue = value !== null ? value : valueText ?? "—";

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
      <RangeBar value={value} refLow={refLow} refHigh={refHigh} flag={flag} />
    </Link>
  );
}
