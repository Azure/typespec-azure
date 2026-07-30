import { describe, expect, it } from "vitest";
import type { SwaggerDocument } from "../../src/migrate/swagger-types.js";
import {
  collectParamLocations,
  extractOperations,
  namespaceFromPaths,
  resolveRefPath,
  versionFromPath,
} from "../../src/migrate/swagger.js";

describe("versionFromPath", () => {
  it("reads the segment after stable/preview", () => {
    expect(versionFromPath("specs/Foo/stable/2024-06-01/foo.json")).toBe("2024-06-01");
    expect(versionFromPath("specs/Foo/preview/2024-06-01-preview/foo.json")).toBe(
      "2024-06-01-preview",
    );
  });

  it("returns undefined when there is no version segment", () => {
    expect(versionFromPath("specs/Foo/foo.json")).toBeUndefined();
  });
});

describe("namespaceFromPaths", () => {
  it("extracts the provider namespace", () => {
    expect(namespaceFromPaths(["/subscriptions/{id}/providers/Microsoft.EventGrid/topics"])).toBe(
      "Microsoft.EventGrid",
    );
  });

  it("returns undefined without a providers segment", () => {
    expect(namespaceFromPaths(["/health"])).toBeUndefined();
  });
});

describe("resolveRefPath", () => {
  it("resolves relative refs against the swagger file and strips fragments", () => {
    expect(resolveRefPath("/specs/foo.json", "./examples/Get.json#/x")).toBe(
      "/specs/examples/Get.json",
    );
  });
});

describe("collectParamLocations", () => {
  const doc: SwaggerDocument = {
    parameters: {
      SubscriptionIdParameter: { name: "subscriptionId", in: "path" },
    },
  };

  it("resolves local $refs and inline params", () => {
    const map = collectParamLocations(doc, [
      { $ref: "#/parameters/SubscriptionIdParameter" },
      { name: "$top", in: "query" },
    ]);
    expect(map.get("subscriptionId")).toBe("path");
    expect(map.get("$top")).toBe("query");
  });
});

describe("extractOperations", () => {
  it("collects operations with x-ms-examples and merges path + operation params", () => {
    const doc: SwaggerDocument = {
      parameters: { Sub: { name: "subscriptionId", in: "path" } },
      paths: {
        "/things/{id}": {
          parameters: [{ $ref: "#/parameters/Sub" }],
          get: {
            operationId: "Things_Get",
            parameters: [{ name: "id", in: "path" }],
            "x-ms-examples": { "Get a thing": { $ref: "./examples/Get.json" } },
          },
          post: { operationId: "Things_NoExamples" },
        },
      },
    };
    const ops = extractOperations(doc);
    expect(ops).toHaveLength(1);
    expect(ops[0].operationId).toBe("Things_Get");
    expect(ops[0].paramLocations.get("subscriptionId")).toBe("path");
    expect(ops[0].paramLocations.get("id")).toBe("path");
    expect(Object.keys(ops[0].examples)).toEqual(["Get a thing"]);
  });
});
