import { getClient } from "@azure-rest/core-client";
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { describe, expect, it } from "vitest";
import {
  getLongRunningPoller,
  getPathParameterFromUrl,
} from "../../../static/static-helpers/pollingHelpers.js";

describe("LRO operation metadata", () => {
  it("refreshes missing values and retains metadata after cancellation", async () => {
    const pollingUrl = "https://example.test/prefix/operations/job%2F123?api-version=1";
    const requests: string[] = [];
    const bodies = [
      { status: "Running", progress: 2 },
      { status: "Running" },
      { status: "Canceled", progress: 3 },
    ];
    const client = getClient("https://example.test", {
      httpClient: {
        async sendRequest(request) {
          requests.push(request.url);
          const initial = request.method === "POST";
          return {
            request,
            status: initial ? 202 : 200,
            headers: createHttpHeaders({
              "content-type": "application/json",
              ...(initial ? { "operation-location": pollingUrl } : {}),
            }),
            bodyAsText: JSON.stringify(initial ? { progress: 1 } : bodies.shift()),
          };
        },
      },
    });
    const poller = getLongRunningPoller(client, async () => undefined, ["200", "202"], {
      getInitialResponse: () => client.path("/start").post(),
      updateIntervalInMs: 0,
      getOperationMetadata: (response, location) => ({
        progress: response?.body?.progress,
        operationId: getPathParameterFromUrl(location, "/operations/{id}", "id"),
      }),
    });
    await poller.submitted();
    expect(Reflect.get(poller.operationState!, "progress")).toBe(1);
    expect(Reflect.get(poller.operationState!, "operationId")).toBe("job/123");

    await poller.poll();
    expect(Reflect.get(poller.operationState!, "progress")).toBe(2);
    await poller.poll();
    expect(Reflect.get(poller.operationState!, "progress")).toBeUndefined();
    await expect(poller.poll()).rejects.toThrow("Operation was canceled");
    expect(poller.operationState?.status).toBe("canceled");
    expect(Reflect.get(poller.operationState!, "progress")).toBe(3);
    expect(requests.slice(1)).toEqual([pollingUrl, pollingUrl, pollingUrl]);
  });

  it("keeps the last monitor metadata when a final-resource GET follows", async () => {
    const client = getClient("https://example.test", {
      httpClient: {
        async sendRequest(request) {
          const initial = request.method === "POST";
          const final = request.url.endsWith("/resource");
          return {
            request,
            status: initial ? 202 : 200,
            headers: createHttpHeaders({
              "content-type": "application/json",
              ...(initial
                ? {
                    "operation-location": "https://example.test/operations/123",
                    location: "https://example.test/resource",
                  }
                : {}),
            }),
            bodyAsText: JSON.stringify(
              initial ? {} : final ? { progress: 999 } : { status: "Succeeded", progress: 42 },
            ),
          };
        },
      },
    });
    const poller = getLongRunningPoller(client, async (response) => response.body, ["200", "202"], {
      getInitialResponse: () => client.path("/start").post(),
      resourceLocationConfig: "location",
      updateIntervalInMs: 0,
      getOperationMetadata: (response) => ({ progress: response?.body?.progress }),
    });
    expect(await poller.pollUntilDone()).toEqual({ progress: 999 });
    expect(Reflect.get(poller.operationState!, "progress")).toBe(42);
  });
});
