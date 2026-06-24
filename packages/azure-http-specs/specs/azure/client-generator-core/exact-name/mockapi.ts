import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const modelBody = { name: "test" };

Scenarios.Azure_ClientGenerator_Core_ExactName_Model = passOnSuccess([
  {
    uri: "/azure/client-generator-core/exact-name/model",
    method: "post",
    request: {
      body: json(modelBody),
    },
    response: {
      status: 200,
      body: json(modelBody),
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ExactName_Property = passOnSuccess([
  {
    uri: "/azure/client-generator-core/exact-name/property",
    method: "post",
    request: {
      body: json(modelBody),
    },
    response: {
      status: 200,
      body: json(modelBody),
    },
    kind: "MockApiDefinition",
  },
]);

const enumValueBody = { protocol: "a2a" };

Scenarios.Azure_ClientGenerator_Core_ExactName_EnumValue = passOnSuccess([
  {
    uri: "/azure/client-generator-core/exact-name/enum-value",
    method: "post",
    request: {
      body: json(enumValueBody),
    },
    response: {
      status: 200,
      body: json(enumValueBody),
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ExactName_Operation = passOnSuccess([
  {
    uri: "/azure/client-generator-core/exact-name/operation",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ExactName_Parameter = passOnSuccess([
  {
    uri: "/azure/client-generator-core/exact-name/parameter",
    method: "get",
    request: {
      query: {
        myParam: "hello",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);
