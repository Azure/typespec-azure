import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, describe, expect, it } from "vitest";
import { resolveLegacyExamples } from "../../src/resolve/index.js";

const serviceYaml = `
versions:
  - version: "2023-01-01"
    source: typespec
  - version: "2024-06-01"
    source: typespec
`;

const examplesYaml = `
$namespace: Microsoft.Test
Things.get:
  - request:
      path: { subscriptionId: sub, id: "1" }
    responses:
      200: { body: { name: thing } }
Things.create:
  - request:
      path: { id: "1" }
      body: { name: created }
    responses:
      200: { body: { name: created } }
`;

const swagger = {
  swagger: "2.0",
  paths: {
    "/subscriptions/{subscriptionId}/things/{id}": {
      parameters: [{ name: "subscriptionId", in: "path", type: "string" }],
      get: {
        operationId: "Things_Get",
        parameters: [
          { name: "id", in: "path", type: "string" },
          { name: "api-version", in: "query", type: "string" },
        ],
        "x-ms-examples": { get: { $ref: "./examples/get.json" } },
        responses: { "200": {} },
      },
      put: {
        operationId: "Things_Create",
        parameters: [
          { name: "id", in: "path", type: "string" },
          { name: "api-version", in: "query", type: "string" },
          { name: "resource", in: "body", schema: { type: "object" } },
        ],
        "x-ms-examples": { create: { $ref: "./examples/create.json" } },
        responses: { "200": {} },
      },
    },
  },
};

const roots: string[] = [];

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "examples-legacy-"));
  roots.push(root);
  await writeFile(join(root, "service.yaml"), serviceYaml);
  await writeFile(join(root, "examples.yaml"), examplesYaml);
  const versionDir = join(root, "stable", "2024-06-01");
  await mkdir(versionDir, { recursive: true });
  await writeFile(join(versionDir, "service.json"), JSON.stringify(swagger));
  return root;
}

describe("resolveLegacyExamples", () => {
  it("materializes classic x-ms-examples documents from the unified format", async () => {
    const root = await fixture();
    const result = await resolveLegacyExamples(root, "2024-06-01");
    expect(result.diagnostics).toEqual([]);

    const byName = new Map(result.files.map((f) => [f.fileName, f.document as any]));

    // Get: flat parameters (with api-version re-added), title/operationId envelope, responses.
    const get = byName.get("Things_Get.json");
    expect(get).toEqual({
      title: "Things_Get",
      operationId: "Things_Get",
      parameters: { "api-version": "2024-06-01", subscriptionId: "sub", id: "1" },
      responses: { "200": { body: { name: "thing" } } },
    });

    // Create: the request body is placed back under its Swagger body parameter name (`resource`).
    const create = byName.get("Things_Create.json");
    expect(create.parameters).toEqual({
      "api-version": "2024-06-01",
      id: "1",
      resource: { name: "created" },
    });
  });

  it("warns when an operation has no matching Swagger metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "examples-legacy-"));
    roots.push(root);
    await writeFile(join(root, "service.yaml"), serviceYaml);
    await writeFile(join(root, "examples.yaml"), examplesYaml);
    // No swagger on disk → metadata cannot be resolved.
    const result = await resolveLegacyExamples(root, "2024-06-01");
    expect(result.files).toEqual([]);
    expect(result.diagnostics.map((d) => d.code)).toContain("missing-operation-metadata");
  });
});

afterAll(() => {
  void roots;
});
