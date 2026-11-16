import { assert, describe, it } from "vitest";

import { OperationIdClient } from "./generated/azure/client-generator-core/lro/operation-id/src/index.js";

describe("Azure Client Generator Core LRO Operation ID", () => {
  it("analyzes a document using the complete status-monitor URI", async () => {
    const client = new OperationIdClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });

    const result = await client.analyze("document-1", { updateIntervalInMs: 1 });
    assert.strictEqual(result.summary, "The document contains three sections.");
  });
});
