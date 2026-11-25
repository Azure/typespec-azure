import { assert, beforeEach, describe, it } from "vitest";

import { ApiVersionOverrideClient } from "./generated/azure/core/api-version-override/src/index.js";

describe("Azure Core API version override", () => {
  let client: ApiVersionOverrideClient;

  beforeEach(() => {
    client = new ApiVersionOverrideClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("uses the legacy client's overridden API version", async () => {
    assert.strictEqual(await client.legacyClient.get(), undefined);
  });
});
