import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_SpecialHeaders_ConditionalRequest_postIfMatch = passOnSuccess({
  uri: "/azure/special-headers/conditional-request/if-match",
  method: "post",
  request: {
    headers: {
      "If-Match": '"valid"',
      "If-None-Match": '"invalid"',
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_SpecialHeaders_ConditionalRequest_postCustomIfMatch = passOnSuccess({
  uri: "/azure/special-headers/conditional-request/custom-if-match",
  method: "post",
  request: {
    headers: {
      "x-ms-blob-if-match": '"valid"',
      "x-ms-blob-if-none-match": '"invalid"',
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});
