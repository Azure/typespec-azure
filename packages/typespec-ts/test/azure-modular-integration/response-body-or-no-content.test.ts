import { assert, beforeEach, describe, it } from "vitest";

import { BodyOrNoContentClient } from "./generated/response/body-or-no-content/src/index.js";

describe("BodyOrNoContentClient", () => {
  let client: BodyOrNoContentClient;

  beforeEach(() => {
    client = new BodyOrNoContentClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("returns a response body", async () => {
    let status: number | undefined;
    let requestId: string | undefined;
    const result = await client.getBody({
      onResponse: (response) => {
        status = response.status;
        requestId = response.headers.get("x-ms-request-id");
      },
    });

    assert.deepEqual(result, { content: "hello" });
    assert.strictEqual(status, 200);
    assert.strictEqual(requestId, "body-request");
  });

  it("returns no body for a no-content response", async () => {
    let status: number | undefined;
    let requestId: string | undefined;
    const result = await client.getNoContent({
      onResponse: (response) => {
        status = response.status;
        requestId = response.headers.get("x-ms-request-id");
      },
    });

    assert.isUndefined(result);
    assert.strictEqual(status, 204);
    assert.strictEqual(requestId, "no-content-request");
  });
});
