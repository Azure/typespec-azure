import { assert, beforeEach, describe, it } from "vitest";

import {
  isRestError,
  StatusCodeRangeClient,
} from "./generated/response/status-code-range/src/index.js";

describe("StatusCodeRange Client", () => {
  let client: StatusCodeRangeClient;

  beforeEach(() => {
    client = new StatusCodeRangeClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("deserializes an error response with status code 404", async () => {
    try {
      await client.errorResponseStatusCode404();
      assert.fail("Expected a 404 response");
    } catch (error) {
      assert.isTrue(isRestError(error));
      if (!isRestError(error)) {
        throw error;
      }
      assert.strictEqual(error.statusCode, 404);
      assert.deepStrictEqual(error.details, {
        code: "not-found",
        resourceId: "resource1",
      });
    }
  });

  it("deserializes an error response with a status code in range", async () => {
    try {
      await client.errorResponseStatusCodeInRange();
      assert.fail("Expected a 494 response");
    } catch (error) {
      assert.isTrue(isRestError(error));
      if (!isRestError(error)) {
        throw error;
      }
      assert.strictEqual(error.statusCode, 494);
      assert.deepStrictEqual(error.details, {
        code: "request-header-too-large",
        message: "Request header too large",
      });
    }
  });
});
