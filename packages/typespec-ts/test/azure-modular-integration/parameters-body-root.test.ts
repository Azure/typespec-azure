import { assert, beforeEach, describe, it } from "vitest";

import { BodyRootClient } from "./generated/parameters/body-root/src/index.js";

describe("BodyRoot Client", () => {
  let client: BodyRootClient;

  beforeEach(() => {
    client = new BodyRootClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("sends a nested body root parameter", async () => {
    const result = await client.nested({
      bodyRootParameters: {
        category: "widget",
        linkType: "hard",
        wasSuccessful: true,
      },
    });

    assert.isUndefined(result);
  });
});
