import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function tokenScenario(uri: string, scope: string): ScenarioMockApi {
  return passOnSuccess({
    uri,
    method: "get",
    request: { headers: { authorization: `Bearer ${scope}` } },
    response: { status: 204 },
    kind: "MockApiDefinition",
  });
}

Scenarios.Azure_Core_Authentication_Audience_defaultAudience = tokenScenario(
  "/azure/core/authentication/audience/default",
  "https://search.azure.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_knownAudience = tokenScenario(
  "/azure/core/authentication/audience/known",
  "https://search.azure.us/.default",
);
Scenarios.Azure_Core_Authentication_Audience_customAudience = tokenScenario(
  "/azure/core/authentication/audience/custom",
  "https://custom.example.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_apiKey = passOnSuccess({
  uri: "/azure/core/authentication/audience/key",
  method: "get",
  request: { headers: { "api-key": "valid-key" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
