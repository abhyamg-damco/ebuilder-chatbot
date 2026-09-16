"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RenderableText } from "recharts/types/component/Text";
import {
  categoryAxisWidth,
  HORIZONTAL_ROW_HEIGHT,
  MAX_BAR_SIZE,
  shouldShowDirectLabels,
  shouldShowLegend,
  sortRows,
  toNumericRows,
  truncateCategory,
} from "@/lib/insights/chart-data";
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

function EmptyChartState({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-muted-foreground text-xs">
        No rows came back for this one. Try widening the filter or the date
        range.
      </p>
    </div>
  );
}

/** Renders a bar, ranked horizontal bar, line, or area chart from Ivy content. */
export function ChartView({ chart, compact = false }: ChartViewProps) {
  const rows = sortRows(toNumericRows(chart), chart);
  const isHorizontal = chart.chartType === "bar-horizontal";
  const showDirectLabels = shouldShowDirectLabels(chart, rows.length);

  if (rows.length === 0) {
    return <EmptyChartState title={chart.title} />;
  }

  const height = isHorizontal
    ? Math.max(180, rows.length * HORIZONTAL_ROW_HEIGHT + 32)
    : compact
      ? 220
      : 320;

  const tickFormatter = (value: number) =>
    formatInsightValue(value, chart.format);

  /**
   * Recharts types a label formatter as RenderableText in and out, which
   * includes boolean, null and undefined, so the parameter has to be that wide.
   */
  const labelFormatter = (value: RenderableText): RenderableText => {
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? formatInsightValue(numeric, chart.format)
      : value;
  };

  const commonProps = {
    data: rows,
    margin: {
      top: 8,
      // Room for the value printed to the right of each bar.
      right: showDirectLabels && isHorizontal ? 68 : 8,
      left: 0,
      bottom: 0,
    },
  };

  /** Hairline grid on the value axis only, never across the categories. */
  const grid = (
    <CartesianGrid
      className="stroke-border/50"
      horizontal={!isHorizontal}
      vertical={isHorizontal}
    />
  );
  const tooltip = <Tooltip content={<ChartTooltip format={chart.format} />} />;
  const legend = shouldShowLegend(chart) ? (
    <Legend wrapperStyle={{ fontSize: 12 }} />
  ) : null;

  const renderChart = () => {
    if (chart.chartType === "line") {
      return (
        <LineChart {...commonProps}>
          {grid}
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
          {tooltip}
          {legend}
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
          {grid}
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
          {tooltip}
          {legend}
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

    if (isHorizontal) {
      return (
        <BarChart {...commonProps} layout="vertical">
          {grid}
          <XAxis
            tick={{ fontSize: 11 }}
            tickFormatter={tickFormatter}
            type="number"
          />
          <YAxis
            dataKey={chart.xKey}
            interval={0}
            tick={{ fontSize: 11 }}
            tickFormatter={truncateCategory}
            type="category"
            width={categoryAxisWidth(rows, chart.xKey)}
          />
          {tooltip}
          {legend}
          {chart.series.map((series) => (
            <Bar
              barSize={MAX_BAR_SIZE}
              dataKey={series.key}
              fill={resolveSeriesColor(series.color)}
              key={series.key}
              name={series.label}
              radius={[0, 4, 4, 0]}
            >
              {showDirectLabels ? (
                <LabelList
                  className="fill-foreground"
                  dataKey={series.key}
                  fontSize={11}
                  formatter={labelFormatter}
                  position="right"
                />
              ) : null}
            </Bar>
          ))}
        </BarChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        {grid}
        <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFormatter} />
        {tooltip}
        {legend}
        {chart.series.map((series) => (
          <Bar
            barSize={MAX_BAR_SIZE}
            dataKey={series.key}
            fill={resolveSeriesColor(series.color)}
            key={series.key}
            name={series.label}
            radius={[4, 4, 0, 0]}
          >
            {showDirectLabels ? (
              <LabelList
                className="fill-foreground"
                dataKey={series.key}
                fontSize={11}
                formatter={labelFormatter}
                position="top"
              />
            ) : null}
          </Bar>
        ))}
      </BarChart>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div>
        <h3 className="font-semibold text-sm">{chart.title}</h3>
        {chart.subtitle ? (
          <p className="text-muted-foreground text-xs">{chart.subtitle}</p>
        ) : null}
      </div>
      {/* Horizontal bars keep their computed height and let the panel scroll;
          every other type fills the space it is given. */}
      <div
        className={isHorizontal ? "shrink-0" : "min-h-0 flex-1"}
        style={{ height }}
      >
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
