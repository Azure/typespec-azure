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
  it("captures params (keyed by name+location), body, and responses with local $refs inlined", async () => {
    const signatures = await extractOperationSignatures(swagger({}));
    expect([...signatures.keys()].sort()).toEqual(["Things_Create", "Things_Get"]);

    const create = signatures.get("Things_Create")!;
    expect(create.parameters).toHaveProperty(["path id"]);
    expect(create.parameters).toHaveProperty(["query api-version"]);
    expect(create.body).toEqual({ type: "object", properties: { name: { type: "string" } } });
    expect(create.responses["200"]).toEqual({
      body: { type: "object", properties: { name: { type: "string" } } },
    });
  });

  it("breaks cycles with a $circularRef marker", async () => {
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
    const node = (await extractOperationSignatures(doc)).get("Node_Get")!;
    expect(node.responses["200"]).toEqual({
      body: { type: "object", properties: { next: { $circularRef: "#/definitions/Node" } } },
    });
  });

  it("keys same-named parameters in different locations separately", async () => {
    const doc = swagger({});
    (doc.paths["/things/{id}"].get.parameters as unknown[]).push(
      { name: "scope", in: "query", type: "string" },
      { name: "scope", in: "header", type: "string" },
    );
    const get = (await extractOperationSignatures(doc)).get("Things_Get")!;
    expect(get.parameters).toHaveProperty(["query scope"]);
    expect(get.parameters).toHaveProperty(["header scope"]);
  });
});

describe("diffOperation", () => {
  it("reports no change for identical signatures", async () => {
    const a = await extractOperationSignatures(swagger({}));
    const b = await extractOperationSignatures(swagger({}));
    expect(diffOperation(a.get("Things_Create")!, b.get("Things_Create")!).changed).toBe(false);
    expect(diffOperation(a.get("Things_Get")!, b.get("Things_Get")!).changed).toBe(false);
  });

  it("detects a changed request/response body through an inlined $ref", async () => {
    const previous = await extractOperationSignatures(swagger({}));
    const next = await extractOperationSignatures(swagger({ sku: { type: "string" } }));
    const diff = diffOperation(previous.get("Things_Create")!, next.get("Things_Create")!);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toContain("changed request body");
    expect(diff.reasons).toContain('changed response "200"');
  });

  it("ignores doc-only schema changes (description/title/example)", async () => {
    const previous = await extractOperationSignatures(
      swagger({ tier: { type: "string", description: "old doc" } }),
    );
    const next = await extractOperationSignatures(
      swagger({ tier: { type: "string", description: "new improved doc", example: "gold" } }),
    );
    // Only documentation changed — the contract is identical, so no example is needed.
    expect(diffOperation(previous.get("Things_Create")!, next.get("Things_Create")!).changed).toBe(
      false,
    );
  });

  it("treats reordered `enum` members as unchanged", async () => {
    const previous = await extractOperationSignatures(
      swagger({ tier: { type: "string", enum: ["a", "b"] } }),
    );
    const next = await extractOperationSignatures(
      swagger({ tier: { type: "string", enum: ["b", "a"] } }),
    );
    expect(diffOperation(previous.get("Things_Create")!, next.get("Things_Create")!).changed).toBe(
      false,
    );
  });

  it("detects a change inside a cross-file $ref model", async () => {
    const mainDoc = {
      swagger: "2.0",
      paths: {
        "/x/{id}": {
          get: {
            operationId: "X_Get",
            responses: { "200": { schema: { $ref: "models.json#/definitions/Thing" } } },
          },
        },
      },
    };
    const models = (extra: Record<string, unknown>) => ({
      definitions: {
        Thing: { type: "object", properties: { name: { type: "string" }, ...extra } },
      },
    });
    const loader = (docNs: Record<string, unknown>) => async (p: string) =>
      p.endsWith("models.json") ? docNs : undefined;

    const previous = await extractOperationSignatures(mainDoc, {
      docPath: "/svc/service.json",
      readDoc: loader(models({})),
    });
    const next = await extractOperationSignatures(mainDoc, {
      docPath: "/svc/service.json",
      readDoc: loader(models({ sku: { type: "string" } })),
    });
    // The ref string is unchanged, but the referenced model gained a property → changed.
    const diff = diffOperation(previous.get("X_Get")!, next.get("X_Get")!);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toContain('changed response "200"');
  });

  it("detects added and removed parameters", async () => {
    const previous = await extractOperationSignatures(swagger({}));
    const withParam = swagger({});
    (withParam.paths["/things/{id}"].get.parameters as unknown[]).push({
      name: "expand",
      in: "query",
      type: "boolean",
    });
    const next = await extractOperationSignatures(withParam);
    const forward = diffOperation(previous.get("Things_Get")!, next.get("Things_Get")!);
    expect(forward.reasons).toContain('added parameter "query expand"');
    const backward = diffOperation(next.get("Things_Get")!, previous.get("Things_Get")!);
    expect(backward.reasons).toContain('removed parameter "query expand"');
  });

  it("detects a response header change", async () => {
    const withoutHeader = await extractOperationSignatures(swagger({}));
    const withHeaderDoc = swagger({});
    (withHeaderDoc.paths["/things/{id}"].get.responses as any)["200"].headers = {
      "x-ms-thing": { type: "string" },
    };
    const withHeader = await extractOperationSignatures(withHeaderDoc);
    const diff = diffOperation(withoutHeader.get("Things_Get")!, withHeader.get("Things_Get")!);
    expect(diff.changed).toBe(true);
    expect(diff.reasons).toContain('changed response "200"');
  });
});
