import { assert, beforeEach, describe, it } from "vitest";

import { ResultClient } from "./generated/azure/client-generator-core/lro/result/src/index.js";

describe("LRO result", () => {
  let client: ResultClient;

  beforeEach(() => {
    client = new ResultClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("returns the complete resource by default", async () => {
    const poller = client.createDefault(
      "default",
      { id: "default", status: "Running" },
      { updateIntervalInMs: 0 },
    );

    assert.deepEqual(await poller.pollUntilDone(), {
      id: "default",
      status: "Succeeded",
      result: { value: "completed" },
    });
  });

  it("returns the selected client result", async () => {
    const poller = client.createWithClientLroResult(
      "client-result",
      { id: "client-result", status: "Running" },
      { updateIntervalInMs: 0 },
    );

    assert.deepEqual(await poller.pollUntilDone(), { value: "completed" });
  });
});
