import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";
import { createTelemetryReporter } from "../src/index.js";
import { MockTelemetryService } from "./utils/service.js";

describe("typespec-azure-telemetry", () => {
  describe("createTelemetryReporter", () => {
    it.each([undefined, {}])("should not throw on bad inputs (%o)", async (props) => {
      const reporter = createTelemetryReporter(props as any);
      assert(reporter, "reporter should be defined");
      assert(typeof reporter.logEvent === "function", "logEvent should be a function");
    });
  });

  describe("logEvent", () => {
    let telemetryService: MockTelemetryService;
    beforeEach(async () => {
      telemetryService = new MockTelemetryService();
      await telemetryService.start();
    });

    afterEach(() => {
      return telemetryService.stop();
    });

    it("should send events to the telemetry service", async () => {
      const reporter = createTelemetryReporter({
        instrumentationKey: "dummy-key",
        endpointUrl: telemetryService.url,
      });

      const events = [
        { name: "foo", properties: { count: "1" } },
        { name: "foo", properties: { count: "2" } },
      ];

      const pendingRequests = new Promise<any[]>((resolve) => {
        const actualEvents: any[] = [];
        telemetryService.on("request", (payload) => {
          actualEvents.push(...payload.split("\n").map((p) => JSON.parse(p)));
          if (actualEvents.length === events.length) {
            resolve(actualEvents);
          }
        });
      });

      reporter.logEvent("foo", { properties: { count: "baz" } });
      reporter.logEvent("foo", { properties: { bar: "baz" } });

      const actualEvents = await pendingRequests;

      expect(actualEvents.length).toBe(events.length);
    });

    it("should not throw on bad inputs", async () => {
      const reporter = createTelemetryReporter({ instrumentationKey: "dummy-key" });

      expect(() => reporter.logEvent(undefined as any, undefined as any)).not.toThrow();
      expect(() => reporter.logEvent("foo", undefined as any)).not.toThrow();
      expect(() => reporter.logEvent(undefined as any, {})).not.toThrow();
    });
  });
});
