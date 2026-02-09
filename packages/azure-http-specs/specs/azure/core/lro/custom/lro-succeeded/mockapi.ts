import {
  dyn,
  dynItem,
  json,
  MockRequest,
  passOnSuccess,
  ScenarioMockApi,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

let uploadPollCount = 0;

function uploadPendingHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", "2022-12-01-preview");

  uploadPollCount += 1;
  const response =
    uploadPollCount === 1
      ? { status: "InProgress", statusDetails: "Security domain upload in progress" }
      : { status: "Success", statusDetails: "Security domain upload completed successfully" };

  return { status: 200, body: json(response) };
}

Scenarios.Azure_Core_Lro_Custom_LroSucceeded_upload = passOnSuccess([
  {
    uri: "/azure/core/lro/custom/lro-succeeded/securitydomain/upload",
    method: "post",
    request: {
      body: json({ value: "test-domain" }),
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/core/lro/custom/lro-succeeded/securitydomain/upload/pending`,
      },
      body: json({ status: "InProgress", statusDetails: "Security domain upload initiated" }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/custom/lro-succeeded/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      body: json({ status: "InProgress", statusDetails: "Security domain upload in progress" }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/custom/lro-succeeded/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        status: "Success",
        statusDetails: "Security domain upload completed successfully",
      }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_Core_Lro_Custom_LroSucceeded_uploadPending = passOnSuccess([
  {
    uri: "/azure/core/lro/custom/lro-succeeded/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      body: json({ status: "InProgress", statusDetails: "Security domain upload in progress" }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/custom/lro-succeeded/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        status: "Success",
        statusDetails: "Security domain upload completed successfully",
      }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
]);
