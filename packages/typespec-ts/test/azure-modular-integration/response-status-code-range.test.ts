import { assert, beforeEach, describe, it } from "vitest";

import {
  isRestError,
  StatusCodeRangeClient,
} from "./generated/response/status-code-range/src/index.js";

describe("StatusCodeRangeClient", () => {
  let client: StatusCodeRangeClient;

  beforeEach(() => {
    client = new StatusCodeRangeClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
  });

  it("deserializes an error whose status code is in a range", async () => {
    try {
      await client.errorResponseStatusCodeInRange();
      assert.fail("Expected the request to fail");
    } catch (error) {
      assert.isTrue(isRestError(error));
      if (isRestError(error)) {
        assert.equal(error.statusCode, 494);
        assert.deepEqual(error.details, {
          code: "request-header-too-large",
          message: "Request header too large",
        });
      }
    }
  });

  it("prefers an exact status code over a status code range", async () => {
    try {
      await client.errorResponseStatusCode404();
      assert.fail("Expected the request to fail");
    } catch (error) {
      assert.isTrue(isRestError(error));
      if (isRestError(error)) {
        assert.equal(error.statusCode, 404);
        assert.deepEqual(error.details, {
          code: "not-found",
          resourceId: "resource1",
        });
      }
    }
  });
});
