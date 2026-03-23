import { json, MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function createMockApiDefinition(route: string): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/protocol-and-convenient/${route}/get`,
    method: "get",
    request: {
      query: {
        name: "sample",
      },
    },
    response: {
      status: 200,
      body: json({ name: "sample" }),
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ClientGenerator_Core_ProtocolAndConvenient_OnlyConvenient = passOnSuccess(
  createMockApiDefinition("onlyConvenient"),
);

Scenarios.Azure_ClientGenerator_Core_ProtocolAndConvenient_OnlyProtocol = passOnSuccess(
  createMockApiDefinition("onlyProtocol"),
);

Scenarios.Azure_ClientGenerator_Core_ProtocolAndConvenient_Both = passOnSuccess(
  createMockApiDefinition("both"),
);
