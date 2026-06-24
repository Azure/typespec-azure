import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ClientDoc_Documentation = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-doc/harvest",
    method: "post",
    request: {
      body: json({
        name: "Rose",
        species: "Rosa",
      }),
    },
    response: {
      status: 200,
      body: json({
        name: "Rose",
        species: "Rosa",
      }),
    },
    kind: "MockApiDefinition",
  },
]);
