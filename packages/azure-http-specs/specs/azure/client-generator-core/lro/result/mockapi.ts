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
const jobResult = { value: "completed" };
const pollCounts: Record<string, number> = {
  default: 0,
  "client-result": 0,
  "default-failure": 0,
  "client-result-failure": 0,
};

type ScenarioKind = keyof typeof pollCounts;

function createPollHandler(kind: ScenarioKind, fails: boolean) {
  return (req: MockRequest) => {
    req.expect.containsQueryParam("api-version", apiVersion);
    const pollCount = pollCounts[kind]++;
    return {
      status: 200,
      body: json(
        pollCount === 0
          ? { id: kind, status: "Running" }
          : fails
            ? { id: kind, status: "Failed" }
            : { id: kind, status: "Succeeded", result: jobResult },
      ),
    };
  };
}

function createScenario(kind: ScenarioKind, fails = false): ScenarioMockApi {
  const resourcePath = `/azure/client-generator-core/lro/result/${kind}/jobs/${kind}`;
  const pollingPath = `${resourcePath}/status`;
  const pollHandler = createPollHandler(kind, fails);
  const initial = { id: kind, status: "Running" };
  const completed = fails
    ? { id: kind, status: "Failed" }
    : { id: kind, status: "Succeeded", result: jobResult };

  const apis: ScenarioMockApi["apis"] = [
    {
      uri: resourcePath,
      method: "put",
      request: {
        body: json({ status: "Running" }),
        query: {
          "api-version": apiVersion,
        },
      },
      response: {
        status: 201,
        headers: {
          "operation-location": dyn`${dynItem("baseUrl")}${pollingPath}?api-version=${apiVersion}`,
        },
        body: json(initial),
      },
      handler: (req: MockRequest) => {
        req.expect.containsQueryParam("api-version", apiVersion);
        req.expect.bodyEquals({ status: "Running" });
        pollCounts[kind] = 0;
        return {
          status: 201,
          headers: {
            "operation-location": `${req.baseUrl}${pollingPath}?api-version=${apiVersion}`,
          },
          body: json(initial),
        };
      },
      kind: "MockApiDefinition",
    },
    {
      uri: pollingPath,
      method: "get",
      request: {
        query: {
          "api-version": apiVersion,
        },
      },
      response: {
        status: 200,
        body: json(initial),
      },
      handler: pollHandler,
      kind: "MockApiDefinition",
    },
    {
      uri: pollingPath,
      method: "get",
      request: {
        query: {
          "api-version": apiVersion,
        },
      },
      response: {
        status: 200,
        body: json(completed),
      },
      handler: pollHandler,
      kind: "MockApiDefinition",
    },
  ];

  if (!fails) {
    apis.push({
      uri: resourcePath,
      method: "get",
      request: {
        query: {
          "api-version": apiVersion,
        },
      },
      response: {
        status: 200,
        body: json(completed),
      },
      kind: "MockApiDefinition",
    });
  }

  return passOnSuccess(apis);
}

Scenarios.Azure_ClientGenerator_Core_Lro_Result_createDefault = createScenario("default");
Scenarios.Azure_ClientGenerator_Core_Lro_Result_createWithClientLroResult =
  createScenario("client-result");
Scenarios.Azure_ClientGenerator_Core_Lro_Result_createDefaultWithFailure = createScenario(
  "default-failure",
  true,
);
Scenarios.Azure_ClientGenerator_Core_Lro_Result_createWithClientLroResultWithFailure =
  createScenario("client-result-failure", true);
