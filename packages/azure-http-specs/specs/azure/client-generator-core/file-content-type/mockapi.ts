import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_FileContentType_uploadDefault = passOnSuccess({
  uri: "/azure/client-generator-core/file-content-type/default",
  method: "post",
  request: {
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: {
      contentType: "application/octet-stream",
      rawContent: "test file content",
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});
