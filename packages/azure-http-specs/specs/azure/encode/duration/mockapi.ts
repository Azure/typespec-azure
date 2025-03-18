import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Encode_Duration_durationConstant = passOnSuccess([
  {
    uri: "/azure/encode/duration/duration-constant",
    method: "put",
    request: {
      body: {
        input: "1.02:59:59.5000000",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);
