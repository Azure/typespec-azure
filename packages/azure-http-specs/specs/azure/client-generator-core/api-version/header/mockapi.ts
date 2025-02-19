import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios._Specs__Azure_ClientGenerator_Core_ApiVersion_Header_headerApiVersion = passOnSuccess([
  {
    uri: "/azure/client-generator-core/api-version/header",
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
