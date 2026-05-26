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
