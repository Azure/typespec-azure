import { deepStrictEqual } from "assert";
import { it } from "vitest";
import { openApiFor } from "./test-host.js";

it("supports emitting multiple services", async () => {
  const { Service, Client } = await openApiFor(
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
    ["Service", "Client"],
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
