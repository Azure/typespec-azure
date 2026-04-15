import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const widgetBody = json({
  name: "Widget1",
  color: "red",
});

Scenarios.Azure_ClientGenerator_Core_ConvenientApi_MethodControl = passOnSuccess([
  {
    uri: "/azure/client-generator-core/convenient-api/protocolAndConvenient",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: widgetBody,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/convenient-api/convenientOnly",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: widgetBody,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/convenient-api/protocolOnly",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: widgetBody,
    },
    kind: "MockApiDefinition",
  },
]);
