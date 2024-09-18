import { createTelemetryReporter as createNoOpTelemetryReporter } from "./no-op-reporter.js";
import { TelemetryReporter } from "./types.js";

export function createTelemetryReporter(): TelemetryReporter {
  // No-op reporter in the browser.
  return createNoOpTelemetryReporter();
}
