import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_Environments_defaultEnvironment = passOnSuccess({
  uri: "/public/azure/core/authentication/environments/default",
  method: "get",
  request: { headers: { authorization: "Bearer https://api.loganalytics.io/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Authentication_Environments_governmentEnvironment = passOnSuccess({
  uri: "/government/azure/core/authentication/environments/government",
  method: "get",
  request: { headers: { authorization: "Bearer https://api.loganalytics.us/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Authentication_Environments_endpointOverride = passOnSuccess({
  uri: "/custom/azure/core/authentication/environments/endpoint-override",
  method: "get",
  request: { headers: { authorization: "Bearer https://api.loganalytics.us/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
