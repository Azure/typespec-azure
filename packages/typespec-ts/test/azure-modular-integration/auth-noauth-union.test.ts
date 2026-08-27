import { assert, describe, it } from "vitest";

import { bearerTokenAuthenticationPolicyName } from "@azure/core-rest-pipeline";
import { customBearerTokenAuthenticationPolicy } from "../util/custom-bearer-token-testing-policy.js";
import {
  createUnion,
  validNoAuth,
  validToken,
} from "./generated/authentication/noauth/union/src/api/index.js";

describe("NoAuth and OAuth2 operations", () => {
  const options = {
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 0 },
  };

  it("validNoAuth sends a request without authentication", async () => {
    const context = createUnion(undefined, options);

    assert.isUndefined(await validNoAuth(context));
  });

  it("validToken sends a request with an OAuth2 token", async () => {
    const credential = {
      getToken: async () => ({
        token: "https://security.microsoft.com/.default",
        expiresOnTimestamp: Date.now() + 60_000,
      }),
    };
    const context = createUnion(credential, options);
    // The production policy rejects bearer tokens over HTTP, which is used by the local Spector server.
    context.pipeline.removePolicy({ name: bearerTokenAuthenticationPolicyName });
    context.pipeline.addPolicy(
      customBearerTokenAuthenticationPolicy({
        scopes: "https://security.microsoft.com/.default",
        credential,
      }),
    );

    assert.isUndefined(await validToken(context));
  });
});
