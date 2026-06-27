import { z } from "zod";
import { toToolError, toToolResult } from "../api/client.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

const sortSpecSchema = z.object({
  field: z.string().describe("Dot-path field to sort by"),
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
});

const aggregateSpecSchema = z.object({
  groupBy: z
    .string()
    .optional()
    .describe("Dot-path field to group records by"),
  sumField: z
    .string()
    .optional()
    .describe("Numeric field to sum within each group or overall"),
  count: z
    .boolean()
    .optional()
    .describe("Include record count per group"),
  topN: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Return only top N groups after sorting"),
  sortBy: sortSpecSchema.optional().describe("Sort aggregated results"),
});

type JsonRecord = Record<string, unknown>;

/** Read a nested value using slash or dot path notation. */
function getNestedValue(record: JsonRecord, path: string): unknown {
  const segments = path.includes("/") ? path.split("/") : path.split(".");
  let current: unknown = record;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as JsonRecord)[segment];
  }

  return current;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeRecords(input: unknown): JsonRecord[] {
  if (Array.isArray(input)) {
    return input.filter(
      (item): item is JsonRecord => typeof item === "object" && item !== null
    );
  }

  if (input && typeof input === "object") {
    const records = (input as { records?: unknown[] }).records;
    if (Array.isArray(records)) {
      return records.filter(
        (item): item is JsonRecord => typeof item === "object" && item !== null
      );
    }
  }

  return [];
}

export function registerAggregateRecordsTool(server: ToolRegistrar): void {
  server.registerTool(
    "aggregate_records",
    {
      description: TOOL_GUIDES.aggregate_records,
      inputSchema: {
        data: z
          .unknown()
          .describe(
            "Records array or full API response containing a records key"
          ),
        spec: aggregateSpecSchema.describe("Aggregation specification"),
      },
    },
    async (args) => {
      try {
        const records = normalizeRecords(args.data);
        const spec = aggregateSpecSchema.parse(args.spec ?? {});

        if (records.length === 0) {
          return toToolResult({
            totalInputRecords: 0,
            results: [],
            message: "No records to aggregate.",
          });
        }

        if (!spec.groupBy) {
          const result: JsonRecord = {
            count: records.length,
          };
          if (spec.sumField) {
            result.sum = records.reduce(
              (acc, record) => acc + toNumber(getNestedValue(record, spec.sumField!)),
              0
            );
          }
          return toToolResult({
            totalInputRecords: records.length,
            results: [result],
          });
        }

        const groups = new Map<string, { count: number; sum: number; sample: JsonRecord }>();

        for (const record of records) {
          const keyValue = getNestedValue(record, spec.groupBy);
          const key = keyValue === undefined || keyValue === null ? "(empty)" : String(keyValue);
          const existing = groups.get(key) ?? { count: 0, sum: 0, sample: record };
          existing.count += 1;
          if (spec.sumField) {
            existing.sum += toNumber(getNestedValue(record, spec.sumField));
          }
          groups.set(key, existing);
        }

        let results = Array.from(groups.entries()).map(([key, value]) => ({
          group: key,
          count: value.count,
          ...(spec.sumField ? { sum: value.sum } : {}),
          sampleRecord: value.sample,
        }));

        if (spec.sortBy) {
          const { field, direction } = spec.sortBy;
          results.sort((a, b) => {
            const aVal = getNestedValue(a as JsonRecord, field) ?? (a as JsonRecord)[field.replace("group", "group")];
            const bVal = getNestedValue(b as JsonRecord, field) ?? (b as JsonRecord)[field.replace("group", "group")];

            const aNum =
              field === "count" || field === "sum"
                ? toNumber((a as JsonRecord)[field])
                : toNumber(aVal);
            const bNum =
              field === "count" || field === "sum"
                ? toNumber((b as JsonRecord)[field])
                : toNumber(bVal);

            return direction === "asc" ? aNum - bNum : bNum - aNum;
          });
        } else if (spec.sumField) {
          results.sort((a, b) => (b.sum ?? 0) - (a.sum ?? 0));
        } else {
          results.sort((a, b) => b.count - a.count);
        }

        if (spec.topN) {
          results = results.slice(0, spec.topN);
        }

        return toToolResult({
          totalInputRecords: records.length,
          groupCount: groups.size,
          results,
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
