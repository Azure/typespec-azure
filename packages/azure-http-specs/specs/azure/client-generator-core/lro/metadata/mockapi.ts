import {
  dyn,
  dynItem,
  json,
  MockRequest,
  passOnSuccess,
  type ScenarioMockApi,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

let analyzePollCount = 0;
let translatePollCount = 0;

Scenarios.Azure_ClientGenerator_Core_Lro_Metadata_analyze = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/metadata/analyzers/document-1:analyze",
    method: "post",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/metadata/analyzerResults/analysis-123`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", "2022-12-01-preview");
      analyzePollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/metadata/analyzerResults/analysis-123`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/analyzerResults/analysis-123",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
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
    uri: "/azure/client-generator-core/lro/metadata/analyzerResults/analysis-123",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
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

Scenarios.Azure_ClientGenerator_Core_Lro_Metadata_translate = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/metadata/documents/document-1:translate",
    method: "post",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/metadata/documentTranslationJobs/translation-123`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", "2022-12-01-preview");
      translatePollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/metadata/documentTranslationJobs/translation-123`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/documentTranslationJobs/translation-123",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        id: "translation-123",
        status: "Running",
        percent_complete: 50,
      }),
    },
    handler: translateLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/metadata/documentTranslationJobs/translation-123",
    method: "get",
    request: {
      query: {
        "api-version": "2022-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        id: "translation-123",
        status: "Succeeded",
        percent_complete: 100,
        result: {
          translatedDocumentUrl: "https://example.org/documents/document-1.fr",
        },
      }),
    },
    handler: translateLroHandler,
    kind: "MockApiDefinition",
  },
]);

function analyzeLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", "2022-12-01-preview");
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

function translateLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", "2022-12-01-preview");
  const response =
    translatePollCount > 0
      ? {
          id: "translation-123",
          status: "Succeeded",
          percent_complete: 100,
          result: {
            translatedDocumentUrl: "https://example.org/documents/document-1.fr",
          },
        }
      : {
          id: "translation-123",
          status: "Running",
          percent_complete: 50,
        };
  translatePollCount += 1;
  return { status: 200, body: json(response) };
}
