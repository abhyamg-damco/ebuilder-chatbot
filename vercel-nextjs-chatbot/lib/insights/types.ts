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
  const paletteHex: Record<ChartPaletteColor, string> = {
    sky: "#0ea5e9",
    emerald: "#10b981",
    amber: "#f59e0b",
    violet: "#8b5cf6",
    rose: "#f43f5e",
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
  })
  .optional();

export const chartContentSchema = z.object({
  chartType: z.enum(["bar", "line", "area"]).default("bar"),
  title: z.string(),
  subtitle: z.string().optional(),
  xKey: z.string(),
  series: z.array(chartSeriesSchema).min(1),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  format: chartFormatSchema,
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
  contentType: z.string().optional(),
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
    const record =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : raw;

    if (record && typeof record === "object" && !Array.isArray(record) && record.chart) {
      return dashboardContentSchema.parse({
        ...record,
        chart: normalizeChartPayload(record.chart),
      });
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

/** Format a numeric cell using chart format options. */
export function formatInsightValue(
  value: number,
  format?: ChartContent["format"]
): string {
  let num = value;
  if (format?.divideBy && format.divideBy > 0) {
    num = value / format.divideBy;
  }
  const decimals = format?.decimals ?? (format?.divideBy ? 1 : 0);
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${format?.valuePrefix ?? ""}${formatted}${format?.valueSuffix ?? ""}`;
}
