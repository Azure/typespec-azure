import { json, MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function createMockApiDefinition(route: string, method: "get" | "post"): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/convenient-api/${route}`,
    method: method,
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

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ConvenientNamespace = passOnSuccess([
  createMockApiDefinition("convenientNamespace/operation1", "get"),
  createMockApiDefinition("convenientNamespace/operation2", "post"),
]);

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ProtocolNamespace = passOnSuccess([
  createMockApiDefinition("protocolNamespace/operation1", "get"),
  createMockApiDefinition("protocolNamespace/operation2", "post"),
]);

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ConvenientInterfaceNs = passOnSuccess([
  createMockApiDefinition("convenientInterface/operation1", "get"),
  createMockApiDefinition("convenientInterface/operation2", "post"),
]);

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ProtocolInterfaceNs = passOnSuccess([
  createMockApiDefinition("protocolInterface/operation1", "get"),
  createMockApiDefinition("protocolInterface/operation2", "post"),
]);
