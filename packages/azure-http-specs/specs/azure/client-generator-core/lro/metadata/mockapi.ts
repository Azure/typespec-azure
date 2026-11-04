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

Scenarios.Azure_ClientGenerator_Core_Lro_Metadata_analyzeJob = createJobScenario(false);
Scenarios.Azure_ClientGenerator_Core_Lro_Metadata_analyzeJobWithFailure = createJobScenario(true);

function createJobScenario(fails: boolean): ScenarioMockApi {
  const jobId = fails ? "job-failure" : "job-success";
  const operationPath = fails ? "/jobs/failure:analyze" : "/jobs:analyze";
  const pollingPath = `/azure/client-generator-core/lro/metadata/jobs/${jobId}`;
  let polls = 0;
  const initial = {
    jobId,
    displayName: "Analyze documents",
    createdDateTime: "2025-01-01T10:00:00Z",
    lastUpdatedDateTime: "2025-01-01T10:00:00Z",
    expirationDateTime: "2025-01-02T10:00:00Z",
    status: "NotStarted",
  };
  const running = {
    ...initial,
    status: "Running",
    lastUpdatedDateTime: "2025-01-01T10:01:00Z",
    statistics: { total: 3, succeeded: 1, failed: 0 },
  };
  const terminal = fails
    ? {
        ...initial,
        status: "Failed",
        lastUpdatedDateTime: "2025-01-01T10:02:00Z",
        statistics: { total: 3, succeeded: 1, failed: 2 },
        errors: [
          { code: "InvalidDocument", message: "Document is empty.", target: "document-2" },
          { code: "InvalidDocument", message: "Document is unreadable.", target: "document-3" },
        ],
        error: { code: "JobFailed", message: "Some documents could not be analyzed." },
      }
    : {
        ...initial,
        status: "Succeeded",
        lastUpdatedDateTime: "2025-01-01T10:02:00Z",
        statistics: { total: 3, succeeded: 3, failed: 0 },
        errors: [],
        result: { documents: ["document-1", "document-2", "document-3"] },
      };

  function poll(req: MockRequest) {
    req.expect.containsQueryParam("api-version", apiVersion);
    return { status: 200, body: json(polls++ === 0 ? running : terminal) };
  }

  return passOnSuccess([
    {
      uri: `/azure/client-generator-core/lro/metadata${operationPath}`,
      method: "post",
      request: { query: { "api-version": apiVersion } },
      response: {
        status: 202,
        headers: {
          "operation-location": dyn`${dynItem("baseUrl")}${pollingPath}?api-version=${apiVersion}`,
        },
        body: json(initial),
      },
      handler: (req: MockRequest) => {
        req.expect.containsQueryParam("api-version", apiVersion);
        polls = 0;
        return {
          status: 202,
          headers: {
            "operation-location": `${req.baseUrl}${pollingPath}?api-version=${apiVersion}`,
          },
          body: json(initial),
        };
      },
      kind: "MockApiDefinition",
    },
    ...[running, terminal].map(
      (body) =>
        ({
          uri: pollingPath,
          method: "get",
          request: { query: { "api-version": apiVersion } },
          response: { status: 200, body: json(body) },
          handler: poll,
          kind: "MockApiDefinition",
        }) satisfies ScenarioMockApi["apis"][number],
    ),
  ]);
}
