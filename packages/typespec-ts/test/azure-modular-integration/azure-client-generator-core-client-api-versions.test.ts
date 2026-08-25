import { assert, describe, it } from "vitest";

import { ClientApiVersionsClient } from "./generated/azure/client-generator-core/api-version/client-api-versions/src/index.js";

describe("ClientApiVersionsClient", () => {
  it("sends an API version added by clientApiVersions", async () => {
    const client = new ClientApiVersionsClient({
      endpoint: "http://localhost:3002",
      apiVersion: "2022-10-01",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });

    assert.isUndefined(await client.sendApiVersion());
  });
});
