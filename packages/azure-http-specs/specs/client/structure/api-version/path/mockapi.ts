import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_AlternateApiVersion_Service_pathApiVersion = passOnSuccess([
  {
    uri: "/client/structure/api-version/path/2025-01-01",
    method: "post",
    request: {},
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);
