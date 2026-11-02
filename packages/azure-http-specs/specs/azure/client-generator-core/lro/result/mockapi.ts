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
let defaultPollCount = 0;
let compatibilityPollCount = 0;

function createPollHandler(counter: "default" | "compatibility") {
  return (req: MockRequest) => {
    req.expect.containsQueryParam("api-version", apiVersion);
    const pollCount = counter === "default" ? defaultPollCount++ : compatibilityPollCount++;
    return {
      status: 200,
      body: json(
        pollCount === 0
          ? { id: counter, status: "Running" }
          : { id: counter, status: "Succeeded", result: jobResult },
      ),
    };
  };
}

function createScenario(kind: "default" | "compatibility"): ScenarioMockApi {
  const resourcePath = `/azure/client-generator-core/lro/result/${kind}/jobs/${kind}`;
  const pollingPath = `${resourcePath}/status`;
  const pollHandler = createPollHandler(kind);
  const initial = { id: kind, status: "Running" };
  const completed = { id: kind, status: "Succeeded", result: jobResult };

  return passOnSuccess([
    {
      uri: resourcePath,
      method: "put",
      request: {
        query: {
          "api-version": apiVersion,
        },
      },
      response: {
        status: 202,
        headers: {
          "operation-location": dyn`${dynItem("baseUrl")}${pollingPath}?api-version=${apiVersion}`,
        },
        body: json(initial),
      },
      handler: (req: MockRequest) => {
        req.expect.containsQueryParam("api-version", apiVersion);
        if (kind === "default") {
          defaultPollCount = 0;
        } else {
          compatibilityPollCount = 0;
        }
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
    {
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
    },
  ]);
}

Scenarios.Azure_ClientGenerator_Core_Lro_Result_createDefault = createScenario("default");
Scenarios.Azure_ClientGenerator_Core_Lro_Result_createCompatibility =
  createScenario("compatibility");
