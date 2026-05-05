import {
  json,
  MockApiDefinition,
  MockBody,
  passOnSuccess,
  ScenarioMockApi,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function createMockApiDefinitions(
  route: string,
  body: MockBody,
): [MockApiDefinition, MockApiDefinition] {
  return [
    {
      uri: `/azure/client-generator-core/alternate-type/common-package-ref/${route}`,
      method: "get",
      response: {
        status: 200,
        body: body,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: `/azure/client-generator-core/alternate-type/common-package-ref/${route}`,
      method: "put",
      request: {
        body,
      },
      response: { status: 204 },
      kind: "MockApiDefinition",
    },
  ];
}

const address = {
  city: "Seattle",
  state: "WA",
};

const modelScenarioTypes = createMockApiDefinitions("model", json(address));

Scenarios.Azure_ClientGenerator_Core_AlternateType_CommonPackageRef_getModel = passOnSuccess(
  modelScenarioTypes[0],
);
Scenarios.Azure_ClientGenerator_Core_AlternateType_CommonPackageRef_putModel = passOnSuccess(
  modelScenarioTypes[1],
);

const modelWithAddressProperty = {
  address,
  name: "test",
};

const modelPropertyScenarioTypes = createMockApiDefinitions("property", json(modelWithAddressProperty));

Scenarios.Azure_ClientGenerator_Core_AlternateType_CommonPackageRef_getProperty = passOnSuccess(
  modelPropertyScenarioTypes[0],
);
Scenarios.Azure_ClientGenerator_Core_AlternateType_CommonPackageRef_putProperty = passOnSuccess(
  modelPropertyScenarioTypes[1],
);
