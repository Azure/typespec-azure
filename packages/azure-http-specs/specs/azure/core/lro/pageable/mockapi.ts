import {
  dyn,
  dynItem,
  json,
  MockRequest,
  passOnSuccess,
  ScenarioMockApi,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

let exportPollCount = 0;

function exportLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", "2022-12-01-preview");
  
  if (exportPollCount === 0) {
    // First poll - still in progress
    exportPollCount += 1;
    return { status: 200, body: json({ id: "operation1", status: "InProgress" }) };
  } else {
    // Second poll - succeeded with first page of results
    return {
      status: 200,
      body: json({
        id: "operation1",
        status: "Succeeded",
        result: {
          value: [
            { name: "user1", role: "reader" },
            { name: "user2", role: "contributor" },
          ],
          nextLink: `${req.baseUrl}/azure/core/lro/pageable/users/user1/operations/operation1?page=2&api-version=2022-12-01-preview`,
        },
      }),
    };
  }
}

Scenarios.Azure_Core_Lro_Pageable_export = passOnSuccess([
  {
    uri: "/azure/core/lro/pageable/users/user1:export",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
        format: "json",
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/core/lro/pageable/users/user1/operations/operation1?api-version=2022-12-01-preview`,
      },
      body: json({ id: "operation1", status: "InProgress" }),
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", "2022-12-01-preview");
      req.expect.containsQueryParam("format", "json");
      exportPollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/core/lro/pageable/users/user1/operations/operation1?api-version=2022-12-01-preview`,
        },
        body: json({ id: "operation1", status: "InProgress" }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/pageable/users/user1/operations/operation1",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({ id: "operation1", status: "InProgress" }),
    },
    handler: exportLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/pageable/users/user1/operations/operation1",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        id: "operation1",
        status: "Succeeded",
        result: {
          value: [
            { name: "user1", role: "reader" },
            { name: "user2", role: "contributor" },
          ],
          nextLink: dyn`${dynItem("baseUrl")}/azure/core/lro/pageable/users/user1/operations/operation1?page=2&api-version=2022-12-01-preview`,
        },
      }),
    },
    handler: exportLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/lro/pageable/users/user1/operations/operation1",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
        page: "2",
      },
    },
    response: {
      status: 200,
      body: json({
        id: "operation1",
        status: "Succeeded",
        result: {
          value: [{ name: "user3", role: "owner" }],
        },
      }),
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", "2022-12-01-preview");
      req.expect.containsQueryParam("page", "2");
      return {
        status: 200,
        body: json({
          id: "operation1",
          status: "Succeeded",
          result: {
            value: [{ name: "user3", role: "owner" }],
          },
        }),
      };
    },
    kind: "MockApiDefinition",
  },
]);
