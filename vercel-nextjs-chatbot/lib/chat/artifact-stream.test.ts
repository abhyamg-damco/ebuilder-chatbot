import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ArtifactStreamDelta,
  dispatchKindsForBatch,
} from "./artifact-stream";

/** A new chat starts on the initial artifact, which is a text artifact. */
const INITIAL_KIND = "text";

/** What the server streams when Ivy answers "top five projects by budget". */
const dashboardBatch: ArtifactStreamDelta[] = [
  { type: "data-id", data: "doc-1" },
  { type: "data-title", data: "Top 5 Projects by Original Budget" },
  { type: "data-kind", data: "dashboard" },
  { type: "data-dashboardDelta", data: "{}" },
  { type: "data-finish" },
];

describe("artifact delta dispatch", () => {
  it("hands the dashboard delta to the dashboard definition", () => {
    const kinds = dispatchKindsForBatch(INITIAL_KIND, dashboardBatch);
    const dashboardDelta = dashboardBatch.findIndex(
      (delta) => delta.type === "data-dashboardDelta"
    );

    assert.equal(
      kinds[dashboardDelta],
      "dashboard",
      "the content delta must reach its own artifact, or isVisible never fires and the side panel stays shut"
    );
  });

  it("switches kind from the data-kind delta onward", () => {
    const kinds = dispatchKindsForBatch(INITIAL_KIND, dashboardBatch);
    assert.deepEqual(kinds, [
      "text",
      "text",
      "dashboard",
      "dashboard",
      "dashboard",
    ]);
  });

  it("works when the deltas arrive split across batches", () => {
    const first = dispatchKindsForBatch(
      INITIAL_KIND,
      dashboardBatch.slice(0, 3)
    );
    const second = dispatchKindsForBatch(
      first.at(-1) ?? INITIAL_KIND,
      dashboardBatch.slice(3)
    );

    assert.deepEqual(first, ["text", "text", "dashboard"]);
    assert.deepEqual(second, ["dashboard", "dashboard"]);
  });

  it("handles a second artifact of a different kind in the same chat", () => {
    const sheetBatch: ArtifactStreamDelta[] = [
      { type: "data-kind", data: "sheet" },
      { type: "data-sheetDelta", data: "a,b\n1,2" },
    ];

    assert.deepEqual(dispatchKindsForBatch("dashboard", sheetBatch), [
      "sheet",
      "sheet",
    ]);
  });

  it("keeps the current kind when the batch carries no data-kind", () => {
    const contentOnly: ArtifactStreamDelta[] = [
      { type: "data-chartDelta", data: "{}" },
      { type: "data-finish" },
    ];

    assert.deepEqual(dispatchKindsForBatch("chart", contentOnly), [
      "chart",
      "chart",
    ]);
  });

  it("returns one kind per delta", () => {
    assert.equal(
      dispatchKindsForBatch(INITIAL_KIND, dashboardBatch).length,
      dashboardBatch.length
    );
  });
});
