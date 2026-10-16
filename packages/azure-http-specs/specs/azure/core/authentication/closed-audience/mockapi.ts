import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_ClosedAudience_defaultAudience = passOnSuccess({
  uri: "/azure/core/authentication/closed-audience/default",
  method: "get",
  request: { headers: { authorization: "Bearer https://service.azure.com/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
Scenarios.Azure_Core_Authentication_ClosedAudience_knownAudience = passOnSuccess({
  uri: "/azure/core/authentication/closed-audience/known",
  method: "get",
  request: { headers: { authorization: "Bearer https://service.azure.us/.default" } },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
