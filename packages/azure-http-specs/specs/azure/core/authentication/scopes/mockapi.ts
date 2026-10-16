import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_Scopes_explicitScopes = passOnSuccess({
  uri: "/azure/core/authentication/scopes/explicit",
  method: "get",
  request: {
    headers: {
      authorization: "Bearer https://service.example.com/read https://service.example.com/write",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
