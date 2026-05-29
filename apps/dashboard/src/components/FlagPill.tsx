import type { Flag } from "@health/shared";

interface FlagPillProps {
  flag: Flag;
  size?: "sm" | "md";
}

const STYLES: Record<Flag, { bg: string; fg: string; label: string }> = {
  normal:   { bg: "var(--flag-normal-bg)", fg: "var(--flag-normal)",   label: "norm" },
  low:      { bg: "var(--flag-low-bg)",    fg: "var(--flag-low)",      label: "low"  },
  high:     { bg: "var(--flag-high-bg)",   fg: "var(--flag-high)",     label: "high" },
  critical: { bg: "var(--flag-crit-bg)",   fg: "var(--flag-critical)", label: "crit" },
};

export function FlagPill({ flag, size = "md" }: FlagPillProps) {
  const s = STYLES[flag];
  const cls = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-block rounded-full font-medium ${cls}`}
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function FlagDot({ flag }: { flag: Flag }) {
  const s = STYLES[flag];
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: s.fg }}
    />
  );
}
