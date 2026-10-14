import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function environmentScenario(
  path: string,
  endpointPath: string,
  resource: string,
): ScenarioMockApi {
  return passOnSuccess({
    uri: `/${endpointPath}/azure/core/authentication/environments/${path}`,
    method: "get",
    request: { headers: { authorization: `Bearer ${resource}/.default` } },
    response: { status: 204 },
    kind: "MockApiDefinition",
  });
}

Scenarios.Azure_Core_Authentication_Environments_defaultEnvironment = environmentScenario(
  "default",
  "public",
  "https://service.azure.com",
);
Scenarios.Azure_Core_Authentication_Environments_governmentEnvironment = environmentScenario(
  "government",
  "government",
  "https://service.azure.us",
);
Scenarios.Azure_Core_Authentication_Environments_endpointOverride = environmentScenario(
  "endpoint-override",
  "custom",
  "https://service.azure.us",
);
