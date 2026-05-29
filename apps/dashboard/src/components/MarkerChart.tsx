"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid } from "recharts";

interface Point { date: string; value: number | null; lab_name: string }

export function MarkerChart(props: {
  data: Point[];
  refLow: number | null;
  refHigh: number | null;
  unit: string | null;
}) {
  return (
    <div className="h-80 w-full bg-bg-surface border border-border-soft rounded-2xl p-5">
      <ResponsiveContainer>
        <LineChart data={props.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2138" />
          <XAxis dataKey="date" stroke="#7d8aa5" fontSize={11} />
          <YAxis unit={props.unit ?? ""} stroke="#7d8aa5" fontSize={11} />
          {props.refLow !== null && props.refHigh !== null && (
            <ReferenceArea y1={props.refLow} y2={props.refHigh} fill="#6ee7b7" fillOpacity={0.08} />
          )}
          <Tooltip
            contentStyle={{ background: "#131a2d", border: "1px solid #2a3554", borderRadius: 8, color: "#f4f6fb", fontSize: 12 }}
            labelStyle={{ color: "#93a0bf" }}
          />
          <Line type="monotone" dataKey="value" stroke="#93c5fd" strokeWidth={2} dot={{ r: 4, fill: "#93c5fd" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
