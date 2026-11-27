import { assert, describe, it } from "vitest";

import { TokenCredential } from "@azure/core-auth";
import {
  bearerTokenAuthenticationPolicyName,
  createDefaultHttpClient,
  createHttpHeaders,
  createPipelineRequest,
  HttpClient,
  PipelinePolicy,
} from "@azure/core-rest-pipeline";
import {
  ConfigurationsClient,
  ConfigurationsClientOptionalParams,
  ConfigurationsClientServiceConfiguration,
  KnownConfigurationsAudience,
} from "./generated/azure/core/authentication/configurations/src/index.js";

const SPECTOR_BASE_URL = "http://localhost:3002";

const TOKEN_ENDPOINT_BY_SCOPE: Record<string, string> = {
  "https://api.loganalytics.io/.default": `${SPECTOR_BASE_URL}/azure/core/authentication/configurations/oauth2/public/token`,
  "https://api.loganalytics.us/.default": `${SPECTOR_BASE_URL}/azure/core/authentication/configurations/oauth2/government/token`,
};

function createOAuth2ExchangeTestHarness(options?: ConfigurationsClientOptionalParams) {
  const defaultHttpClient = createDefaultHttpClient();
  const observedClientUrls: string[] = [];
  const observedScopes: (string | string[])[] = [];

  const credential: TokenCredential = {
    async getToken(scopes) {
      observedScopes.push(scopes);
      const scope = Array.isArray(scopes) ? scopes[0] : scopes;
      const tokenUrl = TOKEN_ENDPOINT_BY_SCOPE[scope];
      assert.isDefined(tokenUrl, `Unexpected OAuth2 scope requested: ${String(scope)}`);

      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "mock-client-id",
        client_secret: "mock-client-secret",
        scope,
      }).toString();

      const tokenRequest = createPipelineRequest({
        url: tokenUrl,
        method: "POST",
        headers: createHttpHeaders({
          "content-type": "application/x-www-form-urlencoded",
        }),
        body,
        allowInsecureConnection: true,
      });

      const tokenResponse = await defaultHttpClient.sendRequest(tokenRequest);
      assert.strictEqual(tokenResponse.status, 200);
      const parsed = JSON.parse(tokenResponse.bodyAsText ?? "{}") as {
        access_token: string;
        expires_in: number;
      };
      return {
        token: parsed.access_token,
        expiresOnTimestamp: Date.now() + parsed.expires_in * 1000,
      };
    },
  };

  const httpClient: HttpClient = {
    async sendRequest(request) {
      request.url = request.url.replace("https://localhost:3002", SPECTOR_BASE_URL);
      return defaultHttpClient.sendRequest(request);
    },
  };

  const client = new ConfigurationsClient(credential, {
    ...options,
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 0 },
    httpClient,
  });

  // Record the unmodified URL resolved by ConfigurationsClient before upgrading
  // to https:// for @azure/core-rest-pipeline's bearerTokenAuthenticationPolicy TLS check.
  const inspectAndUpgradeUrlPolicy: PipelinePolicy = {
    name: "inspectAndUpgradeUrlPolicy",
    async sendRequest(request, next) {
      observedClientUrls.push(request.url);
      request.url = request.url.replace("http://localhost:3000", "https://localhost:3002");
      return next(request);
    },
  };
  client.pipeline.addPolicy(inspectAndUpgradeUrlPolicy, {
    beforePolicies: [bearerTokenAuthenticationPolicyName],
  });

  return { client, observedClientUrls, observedScopes };
}

describe("Azure Core Authentication Configurations Client", () => {
  it("uses the default public endpoint and OAuth2 scope without overrides", async () => {
    const { client, observedClientUrls, observedScopes } = createOAuth2ExchangeTestHarness();

    const result = await client.defaultConfiguration();

    assert.strictEqual(result, undefined);
    assert.deepEqual(observedClientUrls, [
      "http://localhost:3000/public/azure/core/authentication/configurations/default",
    ]);
    assert.deepEqual(observedScopes, [["https://api.loganalytics.io/.default"]]);
  });

  it("switches both endpoint and OAuth2 scope when serviceConfiguration is government", async () => {
    const { client, observedClientUrls, observedScopes } = createOAuth2ExchangeTestHarness({
      serviceConfiguration: "government",
    });

    const result = await client.governmentConfiguration();

    assert.strictEqual(result, undefined);
    assert.deepEqual(observedClientUrls, [
      "http://localhost:3000/government/azure/core/authentication/configurations/government",
    ]);
    assert.deepEqual(observedScopes, [["https://api.loganalytics.us/.default"]]);
  });

  it("exports KnownConfigurationsAudience constants and supports audience override", async () => {
    assert.strictEqual(KnownConfigurationsAudience.Public, "https://api.loganalytics.io");
    assert.strictEqual(KnownConfigurationsAudience.Government, "https://api.loganalytics.us");

    const { client, observedScopes } = createOAuth2ExchangeTestHarness({
      endpoint: "http://localhost:3000/government",
      audience: KnownConfigurationsAudience.Government,
    });

    const result = await client.governmentConfiguration();

    assert.strictEqual(result, undefined);
    assert.deepEqual(observedScopes, [["https://api.loganalytics.us/.default"]]);
  });

  it("throws on an unsupported serviceConfiguration value", () => {
    assert.throws(
      () =>
        new ConfigurationsClient(
          { getToken: async () => null },
          {
            serviceConfiguration: "unknown" as unknown as ConfigurationsClientServiceConfiguration,
          },
        ),
      /Unsupported serviceConfiguration "unknown"/,
    );
  });
});
