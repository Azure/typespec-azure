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

Scenarios.Azure_Core_Authentication_Audience_Open_defaultAudience = tokenScenario(
  "/azure/core/authentication/audience/open/default",
  "https://search.azure.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Open_knownAudience = tokenScenario(
  "/azure/core/authentication/audience/open/known",
  "https://search.azure.us/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Open_customAudience = tokenScenario(
  "/azure/core/authentication/audience/open/custom",
  "https://custom.example.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Open_apiKey = passOnSuccess({
  uri: "/azure/core/authentication/audience/open/key",
  method: "get",
  request: { headers: { "api-key": "valid-key" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Authentication_Audience_Closed_defaultAudience = tokenScenario(
  "/azure/core/authentication/audience/closed/default",
  "https://service.azure.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Closed_knownAudience = tokenScenario(
  "/azure/core/authentication/audience/closed/known",
  "https://service.azure.us/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Environments_defaultEnvironment = tokenScenario(
  "/public/azure/core/authentication/audience/environments/default",
  "https://service.azure.com/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Environments_governmentEnvironment = tokenScenario(
  "/government/azure/core/authentication/audience/environments/government",
  "https://service.azure.us/.default",
);
Scenarios.Azure_Core_Authentication_Audience_Environments_endpointOverride = tokenScenario(
  "/custom/azure/core/authentication/audience/environments/endpoint-override",
  "https://service.azure.us/.default",
);
