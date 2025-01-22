import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_AlternateApiVersion_Service_headerApiVersion = passOnSuccess([
  {
    uri: "/client/structure/api-version/header",
    method: "post",
    request: {
      headers: {
        "x-ms-version": "2025-01-01",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);
