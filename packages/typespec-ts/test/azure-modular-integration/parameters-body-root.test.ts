import { assert, describe, it } from "vitest";

import { BodyRootClient } from "./generated/parameters/body-root/src/index.js";

describe("BodyRootClient", () => {
  it("serializes a bodyRoot parameter nested in a wrapper", async () => {
    const client = new BodyRootClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });

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
