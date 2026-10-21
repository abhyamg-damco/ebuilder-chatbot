import assert from "node:assert/strict";
import test from "node:test";
import { parseAllowedHosts } from "../src/config.js";
import { cleanFormFields, confirmationSentence, isValidWeeklyDate, isWriteProjectAllowed, projectMatchScore, projectSearchPatterns } from "../src/weekly-update.js";

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

test("an empty write allowlist permits every project while a populated list restricts writes", () => {
  assert.equal(isWriteProjectAllowed([], "any-project"), true);
  assert.equal(isWriteProjectAllowed(["project-a"], "project-a"), true);
  assert.equal(isWriteProjectAllowed(["project-a"], "project-b"), false);
});

test("builds bounded LIKE-search variants for a spoken project reference", () => {
  const patterns = projectSearchPatterns("Kanija Taneja testing");
  assert.deepEqual(patterns.map(({ value }) => value), ["Kanija Taneja testing", "kanija%taneja%testing", "kanija", "taneja", "testing", "test"]);
  assert.ok(patterns.length <= 6);
});

test("ranks a minor spoken spelling error above unrelated project names", () => {
  assert.ok(projectMatchScore("Kanija Taneja testing", "Kanika Taneja Test Project") > 0.75);
  assert.ok(projectMatchScore("Kanija Taneja testing", "Elevators Amsterdam") < 0.4);
});

test("treats an empty or wildcard host allowlist as unrestricted", () => {
  assert.deepEqual(parseAllowedHosts(undefined), []);
  assert.deepEqual(parseAllowedHosts("*"), []);
  assert.deepEqual(parseAllowedHosts("weekly.example.com, mcp.example.com"), ["weekly.example.com", "mcp.example.com"]);
});
