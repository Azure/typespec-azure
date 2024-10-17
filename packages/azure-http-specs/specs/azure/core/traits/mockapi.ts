import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const validUser = {
  id: 1,
  name: "Madge",
};

Scenarios.Azure_Core_Traits_smokeTest = passOnSuccess({
  uri: "/azure/core/traits/user/:id",
  method: "get",
  request: {
    params: {
      id: "1",
    },
    headers: {
      foo: "123",
      "If-Match": '"valid"',
      "If-None-Match": '"invalid"',
      "If-Modified-Since": "Thu, 26 Aug 2021 14:38:00 GMT",
      "If-Unmodified-Since": "Fri, 26 Aug 2022 14:38:00 GMT",
      "x-ms-client-request-id": "86aede1f-96fa-4e7f-b1e1-bf8a947cb804",
    },
  },
  response: {
    status: 200,
    body: json(validUser),
    headers: {
      bar: "456",
      etag: "11bdc430-65e8-45ad-81d9-8ffa60d55b59",
      "x-ms-client-request-id": "86aede1f-96fa-4e7f-b1e1-bf8a947cb804",
    },
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Traits_repeatableAction = passOnSuccess({
  uri: "/azure/core/traits/user/:id:repeatableAction",
  method: "post",
  request: {
    body: {
      userActionValue: "test",
    },
    headers: {
      "Repeatability-Request-ID": "86aede1f-96fa-4e7f-b1e1-bf8a947cb804",
      "Repeatability-First-Sent": "Mon, 27 Nov 2023 11:58:00 GMT",
    },
    params: {
      id: "1",
    },
  },
  response: {
    status: 200,
    body: json({ userActionResult: "test" }),
    headers: {
      "repeatability-result": "accepted",
    },
  },
  kind: "MockApiDefinition",
});
