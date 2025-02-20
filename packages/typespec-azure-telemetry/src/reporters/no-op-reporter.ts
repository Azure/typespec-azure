import { TelemetryReporter } from "./types.js";

export function createTelemetryReporter(): TelemetryReporter {
  return {
    logEvent() {
      // do nothing
    },
    flush() {
      // do nothing
    },
  };
}
