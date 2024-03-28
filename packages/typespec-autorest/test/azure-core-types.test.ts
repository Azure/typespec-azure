import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

const base = `
@service
@useDependency(Azure.Core.Versions.v1_0_Preview_2)
namespace MyService;
`;

describe("EmbeddingVector", () => {
  it("defines embedding vector models", async () => {
    const result = await openApiFor(`
    ${base}
    model Foo is Azure.Core.EmbeddingVector<int32>;
    `);
    const model = result.definitions["Foo"];
    deepStrictEqual(model, {
      type: "array",
      description: "A vector embedding frequently used in similarity search.",
      "x-ms-embedding-vector": true,
      items: {
        type: "integer",
        format: "int32",
      },
    });
  });
});

describe("armResourceIdentifier", () => {
  it("without config", async () => {
    const result = await openApiFor(`
      ${base}
      scalar Foo extends Azure.Core.armResourceIdentifier;
    `);
    const model = result.definitions["Foo"];
    deepStrictEqual(model, {
      type: "string",
      format: "arm-id",
      description: "A type definition that refers the id to an Azure Resource Manager resource.",
    });
  });

  it("with config", async () => {
    const result = await openApiFor(`
      ${base}
      scalar Foo extends Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}]>;
    `);
    const model = result.definitions["Foo"];
    deepStrictEqual(model, {
      type: "string",
      format: "arm-id",
      description: "A type definition that refers the id to an Azure Resource Manager resource.",
      "x-ms-arm-id-details": {
        allowedResources: [
          {
            scopes: ["tenant", "resourceGroup"],
            type: "Microsoft.RP/type",
          },
        ],
      },
    });
  });
});
