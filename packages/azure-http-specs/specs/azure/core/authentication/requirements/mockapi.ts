import { passOnSuccess, type ScenarioMockApi, ValidationError } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_Requirements_combinedCredentials = passOnSuccess({
  uri: "/azure/core/authentication/requirements/combined",
  method: "get",
  request: {
    headers: {
      "api-key": "valid-key",
      authorization: "Bearer https://service.azure.com/.default",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
Scenarios.Azure_Core_Authentication_Requirements_anonymous = passOnSuccess({
  uri: "/azure/core/authentication/requirements/anonymous",
  method: "get",
  request: {},
  response: { status: 204 },
  handler: (req) => {
    if (req.headers.authorization !== undefined || req.headers["api-key"] !== undefined) {
      throw new ValidationError(
        "Anonymous access must not send authentication headers.",
        "No Authorization or api-key header",
        "Authentication header present",
      );
    }
    return { status: 204 };
  },
  kind: "MockApiDefinition",
});
