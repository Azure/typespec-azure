import { assert, beforeEach, describe, it } from "vitest";

import { HeadClient } from "./generated/payload/head/src/index.js";

describe("Payload Head Client", () => {
  let client: HeadClient;

  beforeEach(() => {
    client = new HeadClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });
  });

  it("should surface response headers for HEAD operation", async () => {
    const result = await client.contentTypeHeaderInResponse();
    assert.strictEqual(result.contentType, "text/plain; charset=utf-8");
    assert.strictEqual(result.metadata, "hello");
  });
});
