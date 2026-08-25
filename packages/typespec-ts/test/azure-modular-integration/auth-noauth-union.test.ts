import { assert, describe, it } from "vitest";

import { bearerTokenAuthenticationPolicyName } from "@azure/core-rest-pipeline";
import { customBearerTokenAuthenticationPolicy } from "../util/custom-bearer-token-testing-policy.js";
import { UnionClient } from "./generated/authentication/noauth/union/src/index.js";

describe("NoAuth and OAuth2 UnionClient", () => {
  const options = {
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 0 },
  };

  it("sends a request without authentication", async () => {
    const client = new UnionClient(undefined, options);

    assert.isUndefined(await client.validNoAuth());
  });

  it("sends a request with an OAuth2 token", async () => {
    const credential = {
      getToken: async () => ({
        token: "https://security.microsoft.com/.default",
        expiresOnTimestamp: Date.now() + 60_000,
      }),
    };
    const client = new UnionClient(credential, options);
    client.pipeline.removePolicy({ name: bearerTokenAuthenticationPolicyName });
    client.pipeline.addPolicy(
      customBearerTokenAuthenticationPolicy({
        scopes: "https://security.microsoft.com/.default",
        credential: {
          getToken: async () => ({
            token: "https://security.microsoft.com/.default",
            expiresOnTimestamp: Date.now() + 60_000,
          }),
        },
      }),
    );

    assert.isUndefined(await client.validToken());
  });
});
