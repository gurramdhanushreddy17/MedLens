"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string | null;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  flag: string;
  report: { reportDate: Date | string | null };
}

interface TrendChartProps {
  testName: string;
  results: LabResult[];
  className?: string;
}

export function TrendChart({ testName, results, className }: TrendChartProps) {
  // Filter to only numeric results with dates, sorted by date
  const chartData = results
    .filter((r) => {
      const num = parseFloat(r.value.replace(/[,\s]/g, ""));
      return !isNaN(num) && r.report.reportDate != null;
    })
    .sort(
      (a, b) =>
        new Date(a.report.reportDate!).getTime() -
        new Date(b.report.reportDate!).getTime()
    )
    .map((r) => ({
      date: formatDate(r.report.reportDate),
      dateRaw: new Date(r.report.reportDate!).getTime(),
      value: parseFloat(r.value.replace(/[,\s]/g, "")),
      flag: r.flag,
      unit: r.unit,
    }));

  if (chartData.length < 2) return null;

  const unit = results[0]?.unit ?? "";
  const refLow = results.find((r) => r.referenceRangeLow !== null)?.referenceRangeLow;
  const refHigh = results.find((r) => r.referenceRangeHigh !== null)?.referenceRangeHigh;

  const flagDotColor = (flag: string) => {
    if (flag === "high") return "#B3492F";
    if (flag === "low") return "#B7822A";
    if (flag === "normal") return "#3F7A54";
    return "#B5BEBB";
  };

  return (
    <div className={cn("bg-surface border border-line rounded p-4", className)}>
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-medium text-ink">{testName} trend</h4>
        {unit && <span className="text-xs text-ink/50 font-mono">{unit}</span>}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#DDE2E0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#101826", opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#101826", opacity: 0.5, fontFamily: "IBM Plex Mono" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #DDE2E0",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "IBM Plex Mono",
              padding: "8px 12px",
            }}
            formatter={(value: unknown, _name: unknown, props: unknown) => {
              const p = props as { payload?: { flag?: string } } | undefined;
              return [
                `${value ?? ""}${unit ? ` ${unit}` : ""}`,
                p?.payload?.flag ? `Flag: ${p.payload.flag}` : testName,
              ];
            }}
            labelStyle={{ color: "#101826", opacity: 0.7, fontFamily: "Inter", marginBottom: 4 }}
          />

          {/* Reference range lines */}
          {refLow !== undefined && refLow !== null && (
            <ReferenceLine
              y={refLow}
              stroke="#B7822A"
              strokeDasharray="4 2"
              label={{ value: `Low ${refLow}`, fontSize: 9, fill: "#B7822A", position: "right" }}
            />
          )}
          {refHigh !== undefined && refHigh !== null && (
            <ReferenceLine
              y={refHigh}
              stroke="#B3492F"
              strokeDasharray="4 2"
              label={{ value: `High ${refHigh}`, fontSize: 9, fill: "#B3492F", position: "right" }}
            />
          )}

          <Line
            type="monotone"
            dataKey="value"
            stroke="#1D6E78"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { flag: string } };
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={flagDotColor(payload.flag)}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 5, fill: "#1D6E78" }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {refLow !== undefined && refLow !== null && (
          <span className="text-2xs text-flag-low">
            — Low threshold: {refLow}
          </span>
        )}
        {refHigh !== undefined && refHigh !== null && (
          <span className="text-2xs text-flag-high">
            — High threshold: {refHigh}
          </span>
        )}
        <span className="text-2xs text-ink/40 ml-auto">
          {chartData.length} data point{chartData.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
