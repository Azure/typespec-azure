import { text } from "node:stream/consumers";
import { assert, beforeEach, describe, it } from "vitest";

import { ResponseReplacementClient } from "./generated/azure/client-generator-core/response-replacement/src/index.js";

describe("Azure Client Generator Core response replacement", () => {
  let client: ResponseReplacementClient;

  beforeEach(() => {
    client = new ResponseReplacementClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("replaces a response body with void", async () => {
    assert.strictEqual(await client.voidResponse(), undefined);
  });

  it("replaces a response body with raw bytes", async () => {
    const response = await client.bytesResponse();
    assert.isDefined(response.readableStreamBody);
    assert.strictEqual(await text(response.readableStreamBody), '{"name":"widget"}');
  });
});
