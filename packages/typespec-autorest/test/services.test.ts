import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { compileMultipleOpenAPI, compileOpenAPI } from "./test-host.js";

it("supports emitting multiple services", async () => {
  const { Service, Client } = await compileMultipleOpenAPI(
    `
      @service(#{ title: "My service" })
      namespace Service {
        op get(): int32;
      }

      @service(#{ title: "Other service" })
      namespace Client {
        @route("other") op other(): string;
      }
      `,
    { Service: "Service/openapi.json", Client: "Client/openapi.json" },
  );

  deepStrictEqual(Service.paths, {
    "/": {
      get: {
        operationId: "Get",
        parameters: [],
        produces: ["text/plain"],
        responses: {
          200: {
            description: "The request has succeeded.",
            schema: { type: "integer", format: "int32" },
          },
        },
      },
    },
  });

  deepStrictEqual(Client.paths, {
    "/other": {
      get: {
        operationId: "Other",
        parameters: [],
        produces: ["text/plain"],
        responses: {
          200: {
            description: "The request has succeeded.",
            schema: { type: "string" },
          },
        },
      },
    },
  });
});

it("does not crash when no @service is defined and a model references a versioned namespace", async () => {
  // Regression test for a null reference crash in the autorest emitter when
  // there is no @service declared but the spec references a model from a
  // versioned namespace (e.g. CommonTypes.AzureEntityResource).
  const openApi = await compileOpenAPI(
    `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      /** Move response */
      model MoveResponse extends Azure.ResourceManager.CommonTypes.AzureEntityResource {
        /** Status */
        movingStatus: string;
      }
      `,
    { preset: "azure" },
  );
  deepStrictEqual(openApi.definitions?.MoveResponse, {
    type: "object",
    description: "Move response",
    properties: {
      movingStatus: {
        type: "string",
        description: "Status",
      },
    },
    required: ["movingStatus"],
    allOf: [
      {
        $ref: "../../common-types/resource-management/v3/types.json#/definitions/AzureEntityResource",
      },
    ],
  });
});
