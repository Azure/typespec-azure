import { json, MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function createGetMockApiDefinition(route: string): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/convenient-api/${route}`,
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

function createPostMockApiDefinition(route: string): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/convenient-api/${route}`,
    method: "post",
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
  createGetMockApiDefinition("convenientNamespace/operation1"),
  createPostMockApiDefinition("convenientNamespace/operation2"),
]);

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ProtocolNamespace = passOnSuccess([
  createGetMockApiDefinition("protocolNamespace/operation1"),
  createPostMockApiDefinition("protocolNamespace/operation2"),
]);

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ConvenientInterfaceNs = passOnSuccess([
  createGetMockApiDefinition("convenientInterface/operation1"),
  createPostMockApiDefinition("convenientInterface/operation2"),
]);

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_ProtocolInterfaceNs = passOnSuccess([
  createGetMockApiDefinition("protocolInterface/operation1"),
  createPostMockApiDefinition("protocolInterface/operation2"),
]);
