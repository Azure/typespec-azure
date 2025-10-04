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
      ? { status: "InProgress", status_details: "Security domain upload in progress" }
      : { status: "Succeeded", status_details: "Security domain upload completed successfully" };

  return { status: 200, body: json(response) };
}

Scenarios.Azure_Core_Lro_Custom_PollingOperation_upload = passOnSuccess([
  {
    uri: "/azure/core/lro/custom/polling-operation/securitydomain/upload",
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
        "operation-location": dyn`${dynItem("baseUrl")}/azure/core/lro/custom/polling-operation/securitydomain/upload/pending`,
      },
      body: json({ status: "InProgress", status_details: "Security domain upload initiated" }),
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", "2022-12-01-preview");
      req.expect.bodyEquals({ value: "test-domain" });
      uploadPollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/core/lro/custom/polling-operation/securitydomain/upload/pending`,
        },
        body: json({ status: "InProgress", status_details: "Security domain upload initiated" }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/custom/polling-operation/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      body: json({ status: "InProgress", status_details: "Security domain upload in progress" }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/custom/polling-operation/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        status: "Succeeded",
        status_details: "Security domain upload completed successfully",
      }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_Core_Lro_Custom_PollingOperation_uploadPending = passOnSuccess([
  {
    uri: "/azure/core/lro/custom/polling-operation/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      body: json({ status: "InProgress", status_details: "Security domain upload in progress" }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/custom/polling-operation/securitydomain/upload/pending",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        status: "Succeeded",
        status_details: "Security domain upload completed successfully",
      }),
    },
    handler: uploadPendingHandler,
    kind: "MockApiDefinition",
  },
]);
