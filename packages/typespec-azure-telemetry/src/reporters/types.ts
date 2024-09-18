import type { ISenderConfig } from "@microsoft/applicationinsights-web-basic";

export interface LogEventData {
  properties?: Record<string, string | undefined>;
  measurements?: Record<string, number | undefined>;
}

export interface TelemetryReporter {
  /**
   * Logs an event to the telemetry system.
   * Events are automatically batched before sending to the telemetry service.
   * Call `flush()` to immediately send the events.
   * @param eventName The name of the event.
   * @param data Fields to be associated with the event.
   */
  logEvent(eventName: string, data: LogEventData): void;
  /**
   * Immediately sends buffered events to the telemetry service.
   */
  flush(): void;
}

export interface CreateTelemetryReporterProps {
  /**
   * The instrumentation key for the telemetry service receiving events.
   */
  instrumentationKey: string;
  /**
   * Custom ingestion endpoint URL to send events.
   */
  endpointUrl?: string;
}

export type CreateTelemetryReporter = (props: CreateTelemetryReporterProps) => TelemetryReporter;
export type ExtensionConfig = Required<
  Pick<ISenderConfig, "alwaysUseXhrOverride" | "httpXHROverride">
>;
