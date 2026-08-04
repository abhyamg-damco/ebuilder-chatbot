import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertMayoFindingTransition } from "./workflow";

describe("Mayo reviewer transitions", () => {
  it("allows decisions and reopening", () => {
    assert.doesNotThrow(() => assertMayoFindingTransition("open", "accepted"));
    assert.doesNotThrow(() => assertMayoFindingTransition("accepted", "open"));
    assert.doesNotThrow(() =>
      assertMayoFindingTransition("accepted", "resolved")
    );
  });

  it("rejects invalid terminal transitions", () => {
    assert.throws(
      () => assertMayoFindingTransition("resolved", "accepted"),
      /cannot transition/
    );
    assert.throws(
      () => assertMayoFindingTransition("carried_forward", "open"),
      /cannot transition/
    );
  });
});
