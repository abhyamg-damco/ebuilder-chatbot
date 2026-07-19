"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartContent } from "@/lib/insights/types";
import { formatInsightValue, resolveSeriesColor } from "@/lib/insights/types";

type ChartViewProps = {
  chart: ChartContent;
  compact?: boolean;
};

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  format?: ChartContent["format"];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((entry) => (
        <div className="flex items-center gap-2" key={entry.name}>
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {typeof entry.value === "number"
              ? formatInsightValue(entry.value, format)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Renders a bar, line, or area chart from structured Ivy insight content. */
export function ChartView({ chart, compact = false }: ChartViewProps) {
  const height = compact ? 220 : 320;
  const data = chart.data.map((row) => {
    const next: Record<string, string | number> = { ...row };
    for (const series of chart.series) {
      const raw = row[series.key];
      if (typeof raw === "number") {
        next[series.key] = raw;
      } else if (typeof raw === "string") {
        const parsed = Number.parseFloat(raw.replace(/,/g, ""));
        next[series.key] = Number.isFinite(parsed) ? parsed : 0;
      }
    }
    return next;
  });

  const tickFormatter = (value: number) =>
    formatInsightValue(value, chart.format);

  const commonProps = {
    data,
    margin: { top: 8, right: 8, left: 0, bottom: 0 },
  };

  const renderChart = () => {
    if (chart.chartType === "line") {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
          <Tooltip content={<ChartTooltip format={chart.format} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.series.map((series) => (
            <Line
              dataKey={series.key}
              dot={false}
              key={series.key}
              name={series.label}
              stroke={resolveSeriesColor(series.color)}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      );
    }

    if (chart.chartType === "area") {
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
          <Tooltip content={<ChartTooltip format={chart.format} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.series.map((series) => (
            <Area
              dataKey={series.key}
              fill={resolveSeriesColor(series.color)}
              fillOpacity={0.2}
              key={series.key}
              name={series.label}
              stroke={resolveSeriesColor(series.color)}
              type="monotone"
            />
          ))}
        </AreaChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
        <Tooltip content={<ChartTooltip format={chart.format} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {chart.series.map((series) => (
          <Bar
            dataKey={series.key}
            fill={resolveSeriesColor(series.color)}
            key={series.key}
            name={series.label}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h3 className="font-semibold text-sm">{chart.title}</h3>
        {chart.subtitle ? (
          <p className="text-muted-foreground text-xs">{chart.subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1" style={{ height }}>
        <ResponsiveContainer height="100%" width="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {chart.footnotes?.length ? (
        <ul className="space-y-1 text-[10px] text-muted-foreground">
          {chart.footnotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
