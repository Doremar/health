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
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={props.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis unit={props.unit ?? ""} />
          {props.refLow !== null && props.refHigh !== null && (
            <ReferenceArea y1={props.refLow} y2={props.refHigh} fill="#dcfce7" fillOpacity={0.6} />
          )}
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#1e3a8a" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
