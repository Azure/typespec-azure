import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_DeserializeEmptyStringAsNull_EmptyUrl = passOnSuccess({
  uri: "/azure/client-generator-core/deserialize-empty-string-as-null/emptyUrl",
  method: "get",
  request: {},
  response: {
    status: 200,
    body: json({
      serviceUrl: "",
    }),
  },
  kind: "MockApiDefinition",
});
