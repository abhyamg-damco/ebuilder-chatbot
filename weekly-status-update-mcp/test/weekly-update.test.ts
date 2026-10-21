import assert from "node:assert/strict";
import test from "node:test";
import { cleanFormFields, confirmationSentence, isValidWeeklyDate } from "../src/weekly-update.js";

test("removes e-Builder HTML section artefacts but preserves ordinary form fields", () => {
  assert.deepEqual(cleanFormFields([
    { name: '"', value: "<h2>Progress</h2>" },
    { name: "Bi-Weekly Comments", value: "On track" },
    { name: '""', value: "<h2>Risk</h2>" },
  ]), [{ name: "Bi-Weekly Comments", value: "On track" }]);
});

test("uses a stable project-and-date confirmation phrase", () => {
  assert.equal(
    confirmationSentence("project-123", "2026-10-23"),
    "I confirm submission of the weekly update for project project-123 dated 2026-10-23.",
  );
});

test("only accepts real ISO calendar dates", () => {
  assert.equal(isValidWeeklyDate("2026-10-23"), true);
  assert.equal(isValidWeeklyDate("10/23/2026"), false);
  assert.equal(isValidWeeklyDate("2026-02-30"), false);
});
