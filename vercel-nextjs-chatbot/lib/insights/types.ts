import { z } from "zod";

/** Artifact kinds produced by Ivy for data visualization. */
export const insightArtifactKinds = [
  "chart",
  "dashboard",
  "file-preview",
  "sheet",
] as const;

export type InsightArtifactKind = (typeof insightArtifactKinds)[number];

export const chartPaletteColors = [
  "sky",
  "emerald",
  "amber",
  "violet",
  "rose",
  "slate",
] as const;

export type ChartPaletteColor = (typeof chartPaletteColors)[number];

const COLOR_ALIASES: Record<string, ChartPaletteColor> = {
  blue: "sky",
  cyan: "sky",
  green: "emerald",
  teal: "emerald",
  orange: "amber",
  yellow: "amber",
  purple: "violet",
  indigo: "violet",
  red: "rose",
  pink: "rose",
  gray: "slate",
  grey: "slate",
};

/** Map model-provided color names to the Ivy chart palette (or pass through hex). */
export function resolveSeriesColor(color?: string): string {
  /**
   * The 600 steps, not the 500s they replace. Measured against the chart
   * surface, sky was 2.70:1, emerald 2.47:1 and amber 2.09:1, all below the
   * 3:1 floor for a mark, which is why a default single-series chart read
   * washed out. One set serves both themes.
   */
  const paletteHex: Record<ChartPaletteColor, string> = {
    sky: "#0284c7",
    emerald: "#059669",
    amber: "#d97706",
    violet: "#7c3aed",
    rose: "#e11d48",
    slate: "#64748b",
  };

  if (!color) {
    return paletteHex.sky;
  }

  const lower = color.toLowerCase();
  if (lower in paletteHex) {
    return paletteHex[lower as ChartPaletteColor];
  }

  const alias = COLOR_ALIASES[lower];
  if (alias) {
    return paletteHex[alias];
  }

  if (/^#[0-9a-f]{3,8}$/i.test(color)) {
    return color;
  }

  return paletteHex.sky;
}

function normalizePaletteColor(value: unknown): ChartPaletteColor | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const lower = value.toLowerCase();
  if ((chartPaletteColors as readonly string[]).includes(lower)) {
    return lower as ChartPaletteColor;
  }

  return COLOR_ALIASES[lower];
}

/** Strip markdown fences and parse JSON object from artifact content. */
export function parseInsightJson(content: string): unknown {
  let trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    trimmed = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  return JSON.parse(trimmed) as unknown;
}

function normalizeChartPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.series)) {
    return record;
  }

  const series = record.series.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }

    const seriesItem = item as Record<string, unknown>;
    const normalizedColor = normalizePaletteColor(seriesItem.color);

    if (normalizedColor) {
      return { ...seriesItem, color: normalizedColor };
    }

    const { color: _removed, ...rest } = seriesItem;
    return rest;
  });

  return { ...record, series };
}

const chartSeriesSchema = z.object({
  key: z.string(),
  label: z.string(),
  color: z.enum(chartPaletteColors).optional(),
});

const chartFormatSchema = z
  .object({
    divideBy: z.number().positive().optional(),
    valueSuffix: z.string().optional(),
    valuePrefix: z.string().optional(),
    decimals: z.number().int().min(0).max(4).optional(),
    /**
     * ISO currency code, for example `USD`.
     *
     * The model reaches for this name on its own, and without it here Zod
     * stripped the key without complaint, so a money axis rendered as raw
     * digits while the model believed it had asked for currency.
     */
    currency: z.string().optional(),
  })
  .optional();

export const chartContentSchema = z.object({
  chartType: z
    .enum(["bar", "bar-horizontal", "line", "area"])
    .default("bar"),
  title: z.string(),
  subtitle: z.string().optional(),
  xKey: z.string(),
  series: z.array(chartSeriesSchema).min(1),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  format: chartFormatSchema,
  /**
   * Row order. `bar-horizontal` sorts descending when this is omitted, because
   * it is the ranked form and an unsorted ranking is the thing that makes it
   * unreadable. Every other type keeps the order it was given, since a time
   * series must never be re-sorted.
   */
  sort: z.enum(["none", "asc", "desc"]).optional(),
  footnotes: z.array(z.string()).optional(),
});

export type ChartContent = z.infer<typeof chartContentSchema>;

const kpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  hint: z.string().optional(),
});

const tableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
});

export const dashboardContentSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  kpis: z.array(kpiSchema).optional(),
  chart: chartContentSchema.optional(),
  table: tableSchema.optional(),
  footnotes: z.array(z.string()).optional(),
});

export type DashboardContent = z.infer<typeof dashboardContentSchema>;

export const filePreviewContentSchema = z.object({
  title: z.string(),
  fileUrl: z.string(),
  fileId: z.string().optional(),
  contentType: z.string().optional(),
  previewable: z.boolean().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export type FilePreviewContent = z.infer<typeof filePreviewContentSchema>;

/** Parse and validate chart JSON from artifact content. */
export function parseChartContent(content: string): ChartContent | null {
  try {
    const raw = parseInsightJson(content);
    const normalized = normalizeChartPayload(raw);
    const parsed = chartContentSchema.safeParse(normalized);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Parse and validate dashboard JSON from artifact content. */
export function parseDashboardContent(content: string): DashboardContent | null {
  try {
    const raw = parseInsightJson(content);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      if (record.chart !== undefined && record.chart !== null) {
        return dashboardContentSchema.parse({
          ...record,
          chart: normalizeChartPayload(record.chart),
        });
      }
    }

    const parsed = dashboardContentSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Parse and validate file preview JSON from artifact content. */
export function parseFilePreviewContent(
  content: string
): FilePreviewContent | null {
  try {
    const parsed = filePreviewContentSchema.safeParse(parseInsightJson(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  INR: "₹",
};

/** Above this, an unscaled figure is unreadable on an axis and gets compacted. */
const COMPACT_THRESHOLD = 10_000;

function resolvePrefix(format?: ChartContent["format"]): string {
  if (format?.valuePrefix) {
    return format.valuePrefix;
  }
  if (!format?.currency) {
    return "";
  }
  const code = format.currency.toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/**
 * Format a numeric cell using chart format options.
 *
 * Figures at or above the compact threshold fall back to compact notation when
 * no scale was asked for, so a budget arrives as `$257.1M` rather than
 * `257,134,160`. An explicit `divideBy` always wins, so a caller that has
 * already chosen its own scale and suffix keeps it.
 */
export function formatInsightValue(
  value: number,
  format?: ChartContent["format"]
): string {
  const prefix = resolvePrefix(format);
  const suffix = format?.valueSuffix ?? "";

  if (format?.divideBy && format.divideBy > 0) {
    const decimals = format.decimals ?? 1;
    const scaled = (value / format.divideBy).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${prefix}${scaled}${suffix}`;
  }

  if (!suffix && Math.abs(value) >= COMPACT_THRESHOLD) {
    const compact = value.toLocaleString("en-US", {
      notation: "compact",
      maximumFractionDigits: format?.decimals ?? 1,
    });
    return `${prefix}${compact}`;
  }

  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: format?.decimals ?? 0,
    maximumFractionDigits: format?.decimals ?? 0,
  });
  return `${prefix}${formatted}${suffix}`;
}
