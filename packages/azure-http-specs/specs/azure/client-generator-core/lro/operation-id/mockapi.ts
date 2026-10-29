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
let translationPollCount = 0;
let translationWithPathPollCount = 0;

Scenarios.Azure_ClientGenerator_Core_Lro_OperationId_analyze = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/operation-id/documentModels/document-1:analyze",
    method: "post",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/operation-id/documentModels/document-1/analyzeResults/analysis-123?api-version=2022-12-01-preview`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", apiVersion);
      analyzePollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/operation-id/documentModels/document-1/analyzeResults/analysis-123?api-version=${apiVersion}`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/operation-id/documentModels/document-1/analyzeResults/analysis-123",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        status: "Running",
      }),
    },
    handler: analyzeLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/operation-id/documentModels/document-1/analyzeResults/analysis-123",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
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

function analyzeLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", apiVersion);
  const response =
    analyzePollCount > 0
      ? {
          status: "Succeeded",
          result: {
            summary: "The document contains three sections.",
          },
        }
      : {
          status: "Running",
        };
  analyzePollCount += 1;
  return { status: 200, body: json(response) };
}

Scenarios.Azure_ClientGenerator_Core_Lro_OperationId_startTranslation = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/operation-id/translations:start",
    method: "post",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/operation-id/translations/status?api-version=2022-12-01-preview`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", apiVersion);
      translationPollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/operation-id/translations/status?api-version=${apiVersion}`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/operation-id/translations/status",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "translation-123",
        status: "Running",
      }),
    },
    handler: translationLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/operation-id/translations/status",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "translation-123",
        status: "Succeeded",
        result: {
          translatedCharacters: 42,
        },
      }),
    },
    handler: translationLroHandler,
    kind: "MockApiDefinition",
  },
]);

function translationLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", apiVersion);
  const response =
    translationPollCount > 0
      ? {
          id: "translation-123",
          status: "Succeeded",
          result: {
            translatedCharacters: 42,
          },
        }
      : {
          id: "translation-123",
          status: "Running",
        };
  translationPollCount += 1;
  return { status: 200, body: json(response) };
}

Scenarios.Azure_ClientGenerator_Core_Lro_OperationId_startTranslationWithPath = passOnSuccess([
  {
    uri: "/azure/client-generator-core/lro/operation-id/translations:start-with-path",
    method: "post",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 202,
      headers: {
        "operation-location": dyn`${dynItem("baseUrl")}/azure/client-generator-core/lro/operation-id/translations/operations/translation-456?api-version=2022-12-01-preview`,
      },
    },
    handler: (req: MockRequest) => {
      req.expect.containsQueryParam("api-version", apiVersion);
      translationWithPathPollCount = 0;
      return {
        status: 202,
        headers: {
          "operation-location": `${req.baseUrl}/azure/client-generator-core/lro/operation-id/translations/operations/translation-456?api-version=${apiVersion}`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/operation-id/translations/operations/translation-456",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "translation-456",
        status: "Running",
      }),
    },
    handler: translationWithPathLroHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/lro/operation-id/translations/operations/translation-456",
    method: "get",
    request: {
      query: {
        "api-version": apiVersion,
      },
    },
    response: {
      status: 200,
      body: json({
        id: "translation-456",
        status: "Succeeded",
        result: {
          translatedCharacters: 84,
        },
      }),
    },
    handler: translationWithPathLroHandler,
    kind: "MockApiDefinition",
  },
]);

function translationWithPathLroHandler(req: MockRequest) {
  req.expect.containsQueryParam("api-version", apiVersion);
  const response =
    translationWithPathPollCount > 0
      ? {
          id: "translation-456",
          status: "Succeeded",
          result: {
            translatedCharacters: 84,
          },
        }
      : {
          id: "translation-456",
          status: "Running",
        };
  translationWithPathPollCount += 1;
  return { status: 200, body: json(response) };
}
