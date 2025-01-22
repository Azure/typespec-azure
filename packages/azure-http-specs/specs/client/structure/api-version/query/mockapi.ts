import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_AlternateApiVersion_Service_queryApiVersion = passOnSuccess([
  {
    uri: "/client/structure/api-version/query",
    method: "post",
    request: {
      params: {
        version: "2025-01-01",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);
