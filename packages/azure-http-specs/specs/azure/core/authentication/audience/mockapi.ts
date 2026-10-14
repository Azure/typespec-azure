import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function tokenScenario(path: string, scope: string): ScenarioMockApi {
  return passOnSuccess({
    uri: `/azure/core/authentication/audience/${path}`,
    method: "get",
    request: { headers: { authorization: `Bearer ${scope}` } },
    response: { status: 204 },
    kind: "MockApiDefinition",
  });
}

Scenarios.Azure_Core_Authentication_Audience_defaultAudience = tokenScenario(
  "default",
  "https://search.azure.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_knownAudience = tokenScenario(
  "known",
  "https://search.azure.us/.default",
);
Scenarios.Azure_Core_Authentication_Audience_customAudience = tokenScenario(
  "custom",
  "https://custom.example.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_apiKey = passOnSuccess({
  uri: "/azure/core/authentication/audience/key",
  method: "get",
  request: { headers: { "api-key": "valid-key" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
