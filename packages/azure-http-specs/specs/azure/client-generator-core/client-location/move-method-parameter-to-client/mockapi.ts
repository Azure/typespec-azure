import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Scenario 4: Move method parameter to client - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveMethodParameterToClient_BlobOperations =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-location/blob",
      method: "get",
      request: {
        query: {
          storageAccount: "testaccount",
          container: "testcontainer",
          blob: "testblob.txt",
        },
      },
      response: {
        status: 200,
        body: json({
          id: "blob-001",
          name: "testblob.txt",
          size: 1024,
          path: "/testcontainer/testblob.txt",
        }),
      },
      kind: "MockApiDefinition",
    },
  ]);
