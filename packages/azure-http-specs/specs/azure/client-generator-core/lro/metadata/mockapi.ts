import {
  dyn,
  dynItem,
  json,
  MockRequest,
  passOnSuccess,
  type ScenarioMockApi,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const apiVersion = "2022-12-01-preview";
let pollCount = 0;

Scenarios.Azure_ClientGenerator_Core_Lro_Metadata_analyzeWithUsage = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/metadata/analyzers/analyzer-1:analyze",
    method: "post",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/metadata/analyzerResults/usage-123?api-version=2022-12-01-preview`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", apiVersion);
      pollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/metadata/analyzerResults/usage-123?api-version=${apiVersion}`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/analyzerResults/usage-123",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "usage-123",
        status: "Running",
        usage: {
          documentPagesBasic: 1,
          tokens: {
            input: 10,
          },
        },
      }),
    },
    handler: statusHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/analyzerResults/usage-123",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "usage-123",
        status: "Succeeded",
        usage: {
          documentPagesBasic: 1,
          tokens: {
            input: 10,
            output: 4,
          },
        },
        result: {
          contents: "The document contains three sections.",
        },
      }),
    },
    handler: statusHandler,
    kind: "MockApiDefinition",
  },
]);

function statusHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", apiVersion);
  const response =
    pollCount > 0
      ? {
          id: "usage-123",
          status: "Succeeded",
          usage: {
            documentPagesBasic: 1,
            tokens: {
              input: 10,
              output: 4,
            },
          },
          result: {
            contents: "The document contains three sections.",
          },
        }
      : {
          id: "usage-123",
          status: "Running",
          usage: {
            documentPagesBasic: 1,
            tokens: {
              input: 10,
            },
          },
        };
  pollCount += 1;
  return { status: 200, body: json(response) };
}
