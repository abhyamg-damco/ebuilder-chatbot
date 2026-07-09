import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBrowserActMessage,
  formatBrowserAgentStart,
  formatBrowserAgentStep,
  formatBrowserNavigateStart,
  formatThinkingActivityMessage,
  formatToolActivityMessage,
} from "./format-agent-activity";

describe("format-agent-activity", () => {
  it("formats browser navigate start with hostname", () => {
    assert.equal(
      formatBrowserNavigateStart("https://login.trimble.com/auth"),
      "Opening login.trimble.com…"
    );
  });

  it("redacts secrets in browser navigate start", () => {
    assert.equal(
      formatBrowserNavigateStart("https://user:secret@example.com", {
        redact: (text) => text.replace("secret", "[redacted]"),
      }),
      "Opening example.com…"
    );
  });

  it("formats browser act instructions", () => {
    assert.match(
      formatBrowserActMessage("click the Sign in button"),
      /Sign in/i
    );
  });

  it("formats login-style browser agent start", () => {
    assert.equal(
      formatBrowserAgentStart("Log in with username and password"),
      "Starting login flow…"
    );
  });

  it("formats browser agent sub-steps", () => {
    assert.equal(
      formatBrowserAgentStep("goto", { url: "https://app.example.com/login" }),
      "Navigating to app.example.com"
    );
    assert.equal(formatBrowserAgentStep("fillForm", {}), "Filling in form fields…");
    assert.equal(formatBrowserAgentStep("done", {}), "Task complete");
  });

  it("formats tool activity via heuristic reasoning", () => {
    assert.match(
      formatToolActivityMessage("getWeather", { city: "San Francisco" }),
      /weather/i
    );
  });

  it("condenses thinking activity text", () => {
    const longReasoning =
      "I need to open the login page first. Then I will enter the credentials and submit the form to complete authentication.";
    const summary = formatThinkingActivityMessage(longReasoning);

    assert.ok(summary.length > 0);
    assert.ok(summary.length <= 103);
  });
});
