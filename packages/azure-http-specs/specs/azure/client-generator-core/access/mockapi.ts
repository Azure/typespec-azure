import {
  json,
  MockApiDefinition,
  MockRequest,
  passOnSuccess,
  ScenarioMockApi,
  ValidationError,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function createMockApiDefinitions(route: string): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/access/${route}`,
    method: "get",
    request: {
      params: {
        name: "sample",
      },
    },
    response: {
      status: 200,
      body: json({ name: "sample" }),
    },
    handler: (req: MockRequest) => {
      if (!("name" in req.query)) {
        throw new ValidationError("Should submit name query", "any string", undefined);
      }
      return {
        status: 200,
        body: json({ name: req.query["name"] }),
      };
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ClientGenerator_Core_Access_PublicOperation = passOnSuccess([
  createMockApiDefinitions("publicOperation/noDecoratorInPublic"),
  createMockApiDefinitions("publicOperation/publicDecoratorInPublic"),
]);

Scenarios.Azure_ClientGenerator_Core_Access_InternalOperation = passOnSuccess([
  createMockApiDefinitions("internalOperation/noDecoratorInInternal"),
  createMockApiDefinitions("internalOperation/internalDecoratorInInternal"),
  createMockApiDefinitions("internalOperation/publicDecoratorInInternal"),
]);

Scenarios.Azure_ClientGenerator_Core_Access_SharedModelInOperation = passOnSuccess([
  createMockApiDefinitions("sharedModelInOperation/public"),
  createMockApiDefinitions("sharedModelInOperation/internal"),
]);

Scenarios.Azure_ClientGenerator_Core_Access_RelativeModelInOperation = passOnSuccess([
  {
    uri: "/azure/client-generator-core/access/relativeModelInOperation/operation",
    method: "get",
    request: {
      params: {
        name: "Madge",
      },
    },
    response: {
      status: 200,
      body: json({ name: "Madge", inner: { name: "Madge" } }),
    },
    handler: (req: MockRequest) => {
      if (!("name" in req.query)) {
        throw new ValidationError("Should submit name query", "any string", undefined);
      }
      return {
        status: 200,
        body: json({ name: "Madge", inner: { name: "Madge" } }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/access/relativeModelInOperation/discriminator",
    method: "get",
    request: {
      params: {
        kind: "real",
      },
    },
    response: {
      status: 200,
      body: json({ name: "Madge", kind: "real" }),
    },
    handler: (req: MockRequest) => {
      if (!("kind" in req.query)) {
        throw new ValidationError("Should submit name query", "any string", undefined);
      }
      return {
        status: 200,
        body: json({ name: "Madge", kind: "real" }),
      };
    },
    kind: "MockApiDefinition",
  },
]);
