import { json, passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_Configurations_defaultConfiguration = createScenario(
  "public",
  "default",
  "https://api.loganalytics.io/.default",
);

Scenarios.Azure_Core_Authentication_Configurations_governmentConfiguration = createScenario(
  "government",
  "government",
  "https://api.loganalytics.us/.default",
);

function createScenario(
  configuration: string,
  operation: string,
  scope: string,
): ScenarioMockApi {
  const form = {
    grant_type: "client_credentials",
    client_id: "mock-client-id",
    client_secret: "mock-client-secret",
    scope,
  };
  const token = `${configuration}-access-token`;
  const tokenResponse = {
    status: 200,
    body: json({ access_token: token, token_type: "Bearer", expires_in: 3600 }),
  };
  return passOnSuccess([
    {
      uri: `/azure/core/authentication/configurations/oauth2/${configuration}/token`,
      method: "post",
      request: {
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: {
          contentType: "application/x-www-form-urlencoded",
          rawContent: new URLSearchParams(form).toString(),
        },
      },
      response: tokenResponse,
      handler: (request) => {
        request.expect.deepEqual(
          request.headers["content-type"]?.split(";")[0],
          "application/x-www-form-urlencoded",
        );
        request.expect.bodyEquals(form);
        return tokenResponse;
      },
      kind: "MockApiDefinition",
    },
    {
      uri: `/${configuration}/azure/core/authentication/configurations/${operation}`,
      method: "get",
      request: { headers: { authorization: `Bearer ${token}` } },
      response: { status: 204 },
      kind: "MockApiDefinition",
    },
  ]);
}
