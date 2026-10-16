import { withKeys, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Authentication_Challenge_resourceChallenge = withKeys([
  "challenge",
  "authenticated",
]).pass({
  uri: "/azure/core/authentication/challenge/resource",
  method: "get",
  request: { headers: { authorization: "Bearer https://vault.azure.net/.default" } },
  response: { status: 204 },
  handler: (req) => {
    if (req.headers.authorization === undefined) {
      return {
        status: 401,
        pass: "challenge",
        headers: {
          "WWW-Authenticate":
            'Bearer authorization="https://login.microsoftonline.com/common", resource="https://vault.azure.net"',
        },
      };
    }
    req.expect.containsHeader("authorization", "Bearer https://vault.azure.net/.default");
    return { status: 204, pass: "authenticated" };
  },
  kind: "MockApiDefinition",
});
