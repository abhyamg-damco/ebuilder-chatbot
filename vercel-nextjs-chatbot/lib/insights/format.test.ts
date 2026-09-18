import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chartContentSchema, formatInsightValue } from "./types";

/**
 * Taken from the "Invoice amounts by vendor" chart produced on 15 September.
 * The model asked for `{"currency":"USD"}`, which is not in the schema, so the
 * axis rendered `60,000,000` instead of `$60M`.
 */
describe("money on a chart axis", () => {
  it("accepts the currency key the model actually emits", () => {
    const parsed = chartContentSchema.parse({
      title: "Invoice amounts by vendor",
      xKey: "vendor",
      series: [{ key: "amount", label: "Invoice Amount" }],
      data: [{ vendor: "*ABC Company", amount: 257_134_160.47 }],
      format: { currency: "USD" },
    });
    assert.equal(
      parsed.format?.currency,
      "USD",
      "the key is silently stripped, so the model's request does nothing"
    );
  });

  it("renders a currency figure with a symbol", () => {
    assert.equal(
      formatInsightValue(257_134_160.47, { currency: "USD" }),
      "$257.1M"
    );
  });

  it("compacts a large figure even with no format at all", () => {
    assert.equal(formatInsightValue(60_000_000), "60M");
  });

  it("leaves a small figure readable", () => {
    assert.equal(formatInsightValue(100, { currency: "USD" }), "$100");
  });

  it("still honours an explicit prefix over the currency key", () => {
    assert.equal(
      formatInsightValue(1500, { currency: "USD", valuePrefix: "£" }),
      "£1,500"
    );
  });

  it("still honours an explicit divideBy", () => {
    assert.equal(
      formatInsightValue(12_500_000, {
        divideBy: 1_000_000,
        valueSuffix: "M",
        decimals: 1,
      }),
      "12.5M"
    );
  });
});
