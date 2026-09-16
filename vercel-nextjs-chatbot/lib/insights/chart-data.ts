import type { ChartContent } from "./types";

export type ChartRow = Record<string, string | number>;

/** Bars stop growing here so a sparse chart does not read as a block of color. */
export const MAX_BAR_SIZE = 24;
/** Row pitch for horizontal bars, which grow down the page rather than across. */
export const HORIZONTAL_ROW_HEIGHT = 40;
/**
 * Row caps for per-bar value labels.
 *
 * Vertical bars share one baseline, so labels sit above narrow columns and
 * collide quickly. Horizontal bars each get their own line, so a label fits
 * however many rows there are, which matters: the vendor chart had 17 rows
 * spanning $100 to $257M, where a one-pixel bar is only readable if it carries
 * its own figure.
 */
export const MAX_DIRECT_LABEL_ROWS = 12;
export const MAX_DIRECT_LABEL_ROWS_HORIZONTAL = 30;
/** Character budget for a category name before it is clipped with an ellipsis. */
export const CATEGORY_LABEL_LIMIT = 28;
/** Rough character width at 11px, used to reserve room for the category axis. */
const CATEGORY_CHAR_WIDTH = 6.5;
const MIN_CATEGORY_AXIS_WIDTH = 80;
const MAX_CATEGORY_AXIS_WIDTH = 200;

/**
 * Clip a category name to the axis gutter.
 *
 * Recharts silently drops a tick whose label collides with its neighbour, so a
 * chart of five long project names can render three of them and leave the other
 * two bars with no identity at all. Clipping to a known width is what stops the
 * axis deciding for itself which categories the reader gets to see.
 */
export function truncateCategory(value: unknown): string {
  const text = String(value ?? "");
  if (text.length <= CATEGORY_LABEL_LIMIT) {
    return text;
  }
  return `${text.slice(0, CATEGORY_LABEL_LIMIT - 1).trimEnd()}…`;
}

/** Reserve enough gutter for the longest category name, within sane bounds. */
export function categoryAxisWidth(rows: ChartRow[], xKey: string): number {
  const longest = rows.reduce((max, row) => {
    const length = truncateCategory(row[xKey]).length;
    return length > max ? length : max;
  }, 0);

  return Math.min(
    MAX_CATEGORY_AXIS_WIDTH,
    Math.max(MIN_CATEGORY_AXIS_WIDTH, Math.ceil(longest * CATEGORY_CHAR_WIDTH))
  );
}

/** Coerce series values to numbers so string figures from MCP still plot. */
export function toNumericRows(chart: ChartContent): ChartRow[] {
  return chart.data.map((row) => {
    const next: ChartRow = { ...row };
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
}

/**
 * Order rows by the first series.
 *
 * Horizontal bars default to descending because they are the ranked form: a
 * "top five" that arrives in query order is the specific thing that makes the
 * chart hard to read. Every other type keeps the order it was given, since a
 * time series must not be re-sorted.
 */
export function sortRows(rows: ChartRow[], chart: ChartContent): ChartRow[] {
  const direction =
    chart.sort ?? (chart.chartType === "bar-horizontal" ? "desc" : "none");

  if (direction === "none") {
    return rows;
  }

  const sortKey = chart.series[0]?.key;
  if (!sortKey) {
    return rows;
  }

  return [...rows].sort((a, b) => {
    const left = typeof a[sortKey] === "number" ? (a[sortKey] as number) : 0;
    const right = typeof b[sortKey] === "number" ? (b[sortKey] as number) : 0;
    return direction === "asc" ? left - right : right - left;
  });
}

/** True when each bar should carry its own value instead of an axis lookup. */
export function shouldShowDirectLabels(
  chart: ChartContent,
  rowCount: number
): boolean {
  const cap =
    chart.chartType === "bar-horizontal"
      ? MAX_DIRECT_LABEL_ROWS_HORIZONTAL
      : MAX_DIRECT_LABEL_ROWS;

  return (
    chart.chartType.startsWith("bar") &&
    chart.series.length === 1 &&
    rowCount <= cap
  );
}

/** A single series is named by the title, so a legend box only adds noise. */
export function shouldShowLegend(chart: ChartContent): boolean {
  return chart.series.length > 1;
}
