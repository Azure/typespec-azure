import { describe, expect, it } from "vitest";
import { diffOperation } from "../../src/add/diff.js";
import { extractOperationSignatures } from "../../src/add/signature.js";

const swagger = (thingProps: Record<string, unknown>) => ({
  swagger: "2.0",
  parameters: { ApiVersion: { name: "api-version", in: "query", type: "string" } },
  paths: {
    "/things/{id}": {
      parameters: [{ name: "id", in: "path", type: "string" }],
      get: {
        operationId: "Things_Get",
        parameters: [{ $ref: "#/parameters/ApiVersion" }],
        responses: { "200": { schema: { $ref: "#/definitions/Thing" } } },
      },
      put: {
        operationId: "Things_Create",
        parameters: [
          { $ref: "#/parameters/ApiVersion" },
          { name: "resource", in: "body", schema: { $ref: "#/definitions/Thing" } },
        ],
        responses: { "200": { schema: { $ref: "#/definitions/Thing" } } },
      },
    },
  },
  definitions: {
    Thing: { type: "object", properties: { name: { type: "string" }, ...thingProps } },
  },
});

describe("extractOperationSignatures", () => {
  it("captures params, body, and responses with local $refs inlined", () => {
    const signatures = extractOperationSignatures(swagger({}));
    expect([...signatures.keys()].sort()).toEqual(["Things_Create", "Things_Get"]);

    const create = signatures.get("Things_Create")!;
    expect(create.parameters).toHaveProperty("id");
    expect(create.parameters).toHaveProperty("api-version");
    // The body $ref is inlined to the resolved Thing schema.
    expect(create.body).toEqual({ type: "object", properties: { name: { type: "string" } } });
    expect(create.responses["200"]).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
    });
  });

  it("breaks cycles with a $circularRef marker", () => {
    const doc = {
      swagger: "2.0",
      paths: {
        "/n": {
          get: {
            operationId: "Node_Get",
            responses: { "200": { schema: { $ref: "#/definitions/Node" } } },
          },
        },
      },
      definitions: {
        Node: { type: "object", properties: { next: { $ref: "#/definitions/Node" } } },
      },
    };
    const node = extractOperationSignatures(doc).get("Node_Get")!;
    expect(node.responses["200"]).toEqual({
      type: "object",
      properties: { next: { $circularRef: "Node" } },
    });
  });
});

describe("diffOperation", () => {
  it("reports no change for identical signatures", () => {
    const a = extractOperationSignatures(swagger({}));
    const b = extractOperationSignatures(swagger({}));
    expect(diffOperation(a.get("Things_Create")!, b.get("Things_Create")!).changed).toBe(false);
    expect(diffOperation(a.get("Things_Get")!, b.get("Things_Get")!).changed).toBe(false);
  });

  it("detects a changed request/response body through an inlined $ref", () => {
    const previous = extractOperationSignatures(swagger({}));
    const next = extractOperationSignatures(swagger({ sku: { type: "string" } }));
    const diff = diffOperation(previous.get("Things_Create")!, next.get("Things_Create")!);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toContain("changed request body");
    expect(diff.reasons).toContain('changed response "200"');
  });

  it("detects added and removed parameters", () => {
    const previous = extractOperationSignatures(swagger({}));
    const withParam = swagger({});
    (withParam.paths["/things/{id}"].get.parameters as unknown[]).push({
      name: "expand",
      in: "query",
      type: "boolean",
    });
    const next = extractOperationSignatures(withParam);
    const forward = diffOperation(previous.get("Things_Get")!, next.get("Things_Get")!);
    expect(forward.reasons).toContain('added parameter "expand"');
    const backward = diffOperation(next.get("Things_Get")!, previous.get("Things_Get")!);
    expect(backward.reasons).toContain('removed parameter "expand"');
  });
});
