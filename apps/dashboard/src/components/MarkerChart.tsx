"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface Point {
  date: string;
  value: number | null;
  lab_name: string;
}

const COLOR = {
  normal: "#6ee7b7",
  low: "#93c5fd",
  high: "#fdba74",
  critical: "#fca5a5",
  line: "#e6e6ea",
  grid: "#1a2138",
  axis: "#7d8aa5",
  refLine: "#6ee7b7",
};

function statusOf(v: number | null, lo: number | null, hi: number | null): "normal" | "low" | "high" {
  if (v == null) return "normal";
  if (hi != null && v > hi) return "high";
  if (lo != null && v < lo) return "low";
  return "normal";
}

function dotColor(v: number | null, lo: number | null, hi: number | null): string {
  const s = statusOf(v, lo, hi);
  return s === "high" ? COLOR.high : s === "low" ? COLOR.low : COLOR.normal;
}

export function MarkerChart(props: {
  data: Point[];
  refLow: number | null;
  refHigh: number | null;
  unit: string | null;
}) {
  const { data, refLow, refHigh, unit } = props;

  // Y-domain: расширим так, чтобы зона нормы всегда была видна с запасом
  const values = data.map((p) => p.value).filter((v): v is number => v != null);
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 1;
  const candidateMin = Math.min(dataMin, refLow ?? dataMin);
  const candidateMax = Math.max(dataMax, refHigh ?? dataMax);
  const pad = (candidateMax - candidateMin || candidateMax || 1) * 0.18;
  const yMin = candidateMin - pad;
  const yMax = candidateMax + pad;

  // Подписи к референсным линиям (мелким шрифтом справа)
  const refLineLabel = (text: string) => ({
    value: text,
    fill: COLOR.axis,
    fontSize: 10,
    position: "right" as const,
  });

  return (
    <div className="h-80 w-full bg-bg-surface border border-border-soft rounded-2xl p-5">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 60, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="markerLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR.line} stopOpacity={0.9} />
              <stop offset="100%" stopColor={COLOR.line} stopOpacity={0.6} />
            </linearGradient>
            <pattern id="refStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR.normal} strokeOpacity={0.06} strokeWidth="6" />
            </pattern>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
          <XAxis dataKey="date" stroke={COLOR.axis} fontSize={11} />
          <YAxis
            domain={[yMin, yMax]}
            unit={unit ?? ""}
            stroke={COLOR.axis}
            fontSize={11}
            allowDecimals
          />

          {/* Зона нормы (если хотя бы одна граница известна) */}
          {refLow != null && refHigh != null && (
            <ReferenceArea
              y1={refLow}
              y2={refHigh}
              fill={COLOR.normal}
              fillOpacity={0.12}
              stroke={COLOR.normal}
              strokeOpacity={0.35}
              strokeDasharray="2 4"
              ifOverflow="extendDomain"
              label={{ value: "норма", fill: COLOR.normal, fontSize: 10, position: "insideTopLeft", opacity: 0.7 }}
            />
          )}
          {refLow != null && refHigh == null && (
            <ReferenceArea
              y1={refLow}
              y2={yMax}
              fill={COLOR.normal}
              fillOpacity={0.10}
              stroke={COLOR.normal}
              strokeOpacity={0.3}
              strokeDasharray="2 4"
              label={{ value: `норма ≥ ${refLow}`, fill: COLOR.normal, fontSize: 10, position: "insideTopLeft", opacity: 0.7 }}
            />
          )}
          {refLow == null && refHigh != null && (
            <ReferenceArea
              y1={yMin}
              y2={refHigh}
              fill={COLOR.normal}
              fillOpacity={0.10}
              stroke={COLOR.normal}
              strokeOpacity={0.3}
              strokeDasharray="2 4"
              label={{ value: `норма ≤ ${refHigh}`, fill: COLOR.normal, fontSize: 10, position: "insideTopLeft", opacity: 0.7 }}
            />
          )}

          {/* Чёткие линии границ + подписи */}
          {refLow != null && (
            <ReferenceLine
              y={refLow}
              stroke={COLOR.refLine}
              strokeOpacity={0.55}
              strokeDasharray="4 4"
              label={refLineLabel(`min ${refLow}`)}
            />
          )}
          {refHigh != null && (
            <ReferenceLine
              y={refHigh}
              stroke={COLOR.refLine}
              strokeOpacity={0.55}
              strokeDasharray="4 4"
              label={refLineLabel(`max ${refHigh}`)}
            />
          )}

          <Tooltip
            contentStyle={{
              background: "#131a2d",
              border: "1px solid #2a3554",
              borderRadius: 8,
              color: "#f4f6fb",
              fontSize: 12,
            }}
            labelStyle={{ color: "#93a0bf" }}
            formatter={(value: number) => {
              const s = statusOf(value, refLow, refHigh);
              const tag = s === "high" ? " ↑ выше нормы" : s === "low" ? " ↓ ниже нормы" : " в норме";
              return [`${value}${unit ? " " + unit : ""}${tag}`, "значение"];
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#markerLine)"
            strokeWidth={2}
            isAnimationActive
            dot={(p: { cx?: number; cy?: number; payload?: Point }) => {
              const cx = p.cx;
              const cy = p.cy;
              const value = p.payload?.value ?? null;
              if (cx == null || cy == null) {
                return <g key={`empty-${Math.random()}`} />;
              }
              const c = dotColor(value, refLow, refHigh);
              const isOff = c !== COLOR.normal;
              return (
                <g key={`${cx}-${cy}`}>
                  {isOff && (
                    <circle cx={cx} cy={cy} r={8} fill={c} fillOpacity={0.18} />
                  )}
                  <circle cx={cx} cy={cy} r={4} fill={c} stroke="#0c0c11" strokeWidth={1.5} />
                </g>
              );
            }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
