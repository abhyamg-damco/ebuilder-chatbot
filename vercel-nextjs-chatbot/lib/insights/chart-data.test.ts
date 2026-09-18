import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryAxisWidth,
  shouldShowDirectLabels,
  shouldShowLegend,
  sortRows,
  toNumericRows,
  truncateCategory,
} from "./chart-data";
import type { ChartContent } from "./types";

/**
 * The question Sid put to Ivy on 13 September, with the rows in the order the
 * query returned them rather than in rank order.
 */
const topProjectsUnsorted: ChartContent = {
  chartType: "bar-horizontal",
  title: "Top 5 projects by budget",
  xKey: "project",
  series: [{ key: "budget", label: "Total budget" }],
  data: [
    { project: "UT Austin Engineering Complex", budget: 76_500_000 },
    { project: "Northwestern Memorial Expansion", budget: 105_000_000 },
    { project: "Boca Raton Civic Center", budget: 54_300_000 },
    { project: "Mayo Clinic Proton Center", budget: 98_200_000 },
    { project: "Miami-Dade Transit Hub", budget: 61_000_000 },
  ],
};

const monthlySpend: ChartContent = {
  chartType: "line",
  title: "Program spend by month",
  xKey: "month",
  series: [{ key: "spend", label: "Spend" }],
  data: [
    { month: "2026-01", spend: 4_000_000 },
    { month: "2026-02", spend: 9_000_000 },
    { month: "2026-03", spend: 2_000_000 },
  ],
};

describe("ranked charts", () => {
  it("puts the largest project first without being asked", () => {
    const rows = sortRows(toNumericRows(topProjectsUnsorted), topProjectsUnsorted);
    assert.equal(rows[0].project, "Northwestern Memorial Expansion");
    assert.equal(rows.at(-1)?.project, "Boca Raton Civic Center");
  });

  it("never reorders a time series", () => {
    const rows = sortRows(toNumericRows(monthlySpend), monthlySpend);
    assert.deepEqual(
      rows.map((row) => row.month),
      ["2026-01", "2026-02", "2026-03"]
    );
  });

  it("honours an explicit ascending sort", () => {
    const rows = sortRows(toNumericRows(topProjectsUnsorted), {
      ...topProjectsUnsorted,
      sort: "asc",
    });
    assert.equal(rows[0].project, "Boca Raton Civic Center");
  });

  it("leaves the rows alone when sorting is turned off", () => {
    const rows = sortRows(toNumericRows(topProjectsUnsorted), {
      ...topProjectsUnsorted,
      sort: "none",
    });
    assert.equal(rows[0].project, "UT Austin Engineering Complex");
  });

  it("does not mutate the rows it was given", () => {
    const rows = toNumericRows(topProjectsUnsorted);
    const before = rows.map((row) => row.project);
    sortRows(rows, topProjectsUnsorted);
    assert.deepEqual(
      rows.map((row) => row.project),
      before
    );
  });
});

describe("category labels", () => {
  it("clips a long project name rather than letting the axis drop it", () => {
    const label = truncateCategory("Northwestern Memorial Hospital Expansion");
    assert.ok(label.length <= 28);
    assert.ok(label.endsWith("…"));
  });

  it("leaves a short name untouched", () => {
    assert.equal(truncateCategory("Mayo Clinic"), "Mayo Clinic");
  });

  it("survives a missing category value", () => {
    assert.equal(truncateCategory(undefined), "");
  });

  it("reserves a wider gutter for longer names", () => {
    const wide = categoryAxisWidth(
      toNumericRows(topProjectsUnsorted),
      "project"
    );
    const narrow = categoryAxisWidth(
      [{ project: "Mayo", budget: 1 }],
      "project"
    );
    assert.ok(
      wide > narrow,
      "a chart of long project names needs more gutter than one of short ones"
    );
  });
});

describe("chart chrome", () => {
  it("labels each bar directly when there is a single series", () => {
    assert.equal(shouldShowDirectLabels(topProjectsUnsorted, 5), true);
  });

  it("drops the per-bar labels once the rows get crowded", () => {
    assert.equal(shouldShowDirectLabels(topProjectsUnsorted, 40), false);
  });

  it("does not label a line chart per point", () => {
    assert.equal(shouldShowDirectLabels(monthlySpend, 3), false);
  });

  it("hides the legend when one series is already named by the title", () => {
    assert.equal(shouldShowLegend(topProjectsUnsorted), false);
  });

  it("keeps the legend when series have to be told apart", () => {
    assert.equal(
      shouldShowLegend({
        ...topProjectsUnsorted,
        series: [
          { key: "budget", label: "Budget" },
          { key: "spent", label: "Spent" },
        ],
      }),
      true
    );
  });
});

describe("values arriving as strings", () => {
  it("plots a figure that came back with thousands separators", () => {
    const rows = toNumericRows({
      ...topProjectsUnsorted,
      data: [{ project: "Mayo Clinic", budget: "1,050,000" }],
    });
    assert.equal(rows[0].budget, 1_050_000);
  });

  it("falls back to zero rather than NaN on unparseable input", () => {
    const rows = toNumericRows({
      ...topProjectsUnsorted,
      data: [{ project: "Mayo Clinic", budget: "not a number" }],
    });
    assert.equal(rows[0].budget, 0);
  });
});

describe("direct labels on the ranked form", () => {
  const ranked: ChartContent = { ...topProjectsUnsorted, chartType: "bar-horizontal" };
  const vertical: ChartContent = { ...topProjectsUnsorted, chartType: "bar" };

  it("labels all 17 rows of the vendor chart", () => {
    // $100 next to $257M is a one-pixel bar. Without its own figure it says
    // nothing at all.
    assert.equal(shouldShowDirectLabels(ranked, 17), true);
  });

  it("still drops them on a crowded vertical bar", () => {
    assert.equal(shouldShowDirectLabels(vertical, 17), false);
  });
});
