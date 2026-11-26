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

  it("throws when default LRO fails", async () => {
    const poller = client.createDefaultWithFailure(
      "default-failure",
      { id: "default-failure", status: "Running" },
      { updateIntervalInMs: 0 },
    );

    try {
      await poller.pollUntilDone();
      assert.fail("Expected polling to fail");
    } catch (error) {
      assert.isDefined(error);
    }
  });

  it("throws when client LRO result fails", async () => {
    const poller = client.createWithClientLroResultWithFailure(
      "client-result-failure",
      { id: "client-result-failure", status: "Running" },
      { updateIntervalInMs: 0 },
    );

    try {
      await poller.pollUntilDone();
      assert.fail("Expected polling to fail");
    } catch (error) {
      assert.isDefined(error);
    }
  });
});
