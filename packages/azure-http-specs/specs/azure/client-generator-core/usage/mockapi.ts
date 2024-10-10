import { json, MockRequest, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_Usage_ModelInOperation = passOnSuccess([
  {
    uri: "/azure/client-generator-core/usage/inputToInputOutput",
    method: "post",
    request: {
      body: {
        name: "Madge",
      },
    },
    response: {
      status: 204,
    },
    handler: (req: MockRequest) => {
      const validBody = { name: "Madge" };
      req.expect.bodyEquals(validBody);
      return { status: 204 };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/usage/outputToInputOutput",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json({ name: "Madge" }),
    },
    handler: (req: MockRequest) => {
      return {
        status: 200,
        body: json({ name: "Madge" }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/usage/modelInReadOnlyProperty",
    method: "put",
    request: {},
    response: {
      status: 200,
      body: json({ result: { name: "Madge" } }),
    },
    handler: (req: MockRequest) => {
      return {
        status: 200,
        body: json({ result: { name: "Madge" } }),
      };
    },
    kind: "MockApiDefinition",
  },
]);
