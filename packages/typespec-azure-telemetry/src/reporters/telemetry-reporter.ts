import { ContextTagKeys } from "@microsoft/applicationinsights-common";
import { getAppInsightsClient } from "../clients/app-insights.js";
import { getFetchHttpOverride } from "../http-overrides/fetch.js";
import { getNodeHttpOverride } from "../http-overrides/node-http.js";
import { getCommonProperties } from "../utils/common-properties.js";
import { isTelemetryDisabled } from "../utils/config.js";
import { getMachineId } from "../utils/machine-id.js";
import { supportsFetch } from "../utils/supports-fetch.js";
import { createTelemetryReporter as createNoOpTelemetryReporter } from "./no-op-reporter.js";
import { CreateTelemetryReporterProps, TelemetryReporter } from "./types.js";

export function createTelemetryReporter(props: CreateTelemetryReporterProps): TelemetryReporter {
  try {
    // Some quick checking to return no-op reporter
    if (!props || !props.instrumentationKey || isTelemetryDisabled()) {
      return createNoOpTelemetryReporter();
    }

    const appInsightsClient = getAppInsightsClient({
      instrumentationKey: props.instrumentationKey,
      httpXHROverride: supportsFetch() ? getFetchHttpOverride() : getNodeHttpOverride(),
      endpointUrl: props.endpointUrl,
    });

    const commonProps = getCommonProperties();
    const machineId = getMachineId();

    const tags = new ContextTagKeys();
    return {
      logEvent(eventName, data) {
        try {
          appInsightsClient.track({
            name: eventName,
            data: data,
            baseType: "EventData",
            ext: {
              user: {
                id: machineId,
              },
            },
            tags: { [tags.sessionId]: commonProps.sessionId },
            baseData: {
              name: eventName,
              properties: {
                ...commonProps,
                ...data.properties,
              },
              measurements: data.measurements,
            },
          });
        } catch {
          // Ignore any errors - any telemetry errors should not affect the main application
        }
      },
      flush() {
        try {
          // Setting async to false causes the flush to be processed immediately without delay.
          // The actual HTTP requests are still async.
          appInsightsClient.flush(false);
        } catch {
          // Ignore any errors - any telemetry errors should not affect the main application
        }
      },
    };
  } catch {
    // If any errors are encountered, fallback to a no-op reporter to prevent errors
    // impacting the actual application.
    return createNoOpTelemetryReporter();
  }
}
