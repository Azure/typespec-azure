import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_Configurations_defaultConfiguration = passOnSuccess({
  uri: "/public/azure/core/authentication/configurations/default",
  method: "get",
  request: { headers: { authorization: "Bearer https://api.loganalytics.io/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Authentication_Configurations_governmentConfiguration = passOnSuccess({
  uri: "/government/azure/core/authentication/configurations/government",
  method: "get",
  request: { headers: { authorization: "Bearer https://api.loganalytics.us/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Authentication_Configurations_endpointOverride = passOnSuccess({
  uri: "/custom/azure/core/authentication/configurations/endpoint-override",
  method: "get",
  request: { headers: { authorization: "Bearer https://api.loganalytics.us/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
