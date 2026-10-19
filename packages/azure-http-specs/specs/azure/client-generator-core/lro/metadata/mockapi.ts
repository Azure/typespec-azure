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
let analyzePollCount = 0;
let analyzeWithUsagePollCount = 0;

Scenarios.Azure_ClientGenerator_Core_Lro_Metadata_analyze = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/metadata/documentModels/document-1:analyze",
    method: "post",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/metadata/documentModels/document-1/analyzeResults/analysis-123?api-version=2022-12-01-preview`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", apiVersion);
      analyzePollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/metadata/documentModels/document-1/analyzeResults/analysis-123?api-version=${apiVersion}`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/documentModels/document-1/analyzeResults/analysis-123",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "analysis-123",
        status: "Running",
      }),
    },
    handler: analyzeLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/documentModels/document-1/analyzeResults/analysis-123",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "analysis-123",
        status: "Succeeded",
        result: {
          summary: "The document contains three sections.",
        },
      }),
    },
    handler: analyzeLroHandler,
    kind: "MockApiDefinition",
  },
]);

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
      analyzeWithUsagePollCount = 0;
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
    handler: analyzeWithUsageLroHandler,
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
    handler: analyzeWithUsageLroHandler,
    kind: "MockApiDefinition",
  },
]);

function analyzeLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", apiVersion);
  const response =
    analyzePollCount > 0
      ? {
          id: "analysis-123",
          status: "Succeeded",
          result: {
            summary: "The document contains three sections.",
          },
        }
      : {
          id: "analysis-123",
          status: "Running",
        };
  analyzePollCount += 1;
  return { status: 200, body: json(response) };
}

function analyzeWithUsageLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", apiVersion);
  const response =
    analyzeWithUsagePollCount > 0
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
  analyzeWithUsagePollCount += 1;
  return { status: 200, body: json(response) };
}
