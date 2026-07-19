"use client";

import { ChartView } from "@/components/insights/chart-view";
import type { DashboardContent } from "@/lib/insights/types";

type DashboardViewProps = {
  dashboard: DashboardContent;
  compact?: boolean;
};

/** KPI grid with optional chart and table for Ivy insight dashboards. */
export function DashboardView({ dashboard, compact = false }: DashboardViewProps) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <h3 className="font-semibold text-sm">{dashboard.title}</h3>
        {dashboard.subtitle ? (
          <p className="text-muted-foreground text-xs">{dashboard.subtitle}</p>
        ) : null}
      </div>

      {dashboard.kpis?.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {dashboard.kpis.map((kpi) => (
            <div
              className="rounded-lg border border-sky-200/60 bg-sky-50/50 p-3 dark:border-sky-900/40 dark:bg-sky-950/20"
              key={`${kpi.label}-${kpi.value}`}
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {kpi.label}
              </div>
              <div className="mt-1 font-semibold text-lg">{kpi.value}</div>
              {kpi.hint ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {kpi.hint}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {dashboard.chart ? (
        <div className="rounded-lg border border-border/60">
          <ChartView chart={dashboard.chart} compact={compact} />
        </div>
      ) : null}

      {dashboard.table ? (
        <div className="overflow-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead className="bg-muted/50">
              <tr>
                {dashboard.table.columns.map((column) => (
                  <th className="px-3 py-2 font-medium" key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.table.rows.map((row) => (
                <tr
                  className="border-t border-border/40"
                  key={row.join("|")}
                >
                  {row.map((cell, index) => (
                    <td className="px-3 py-2" key={`${index}-${String(cell)}`}>
                      {cell ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {dashboard.footnotes?.length ? (
        <ul className="space-y-1 text-[10px] text-muted-foreground">
          {dashboard.footnotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
