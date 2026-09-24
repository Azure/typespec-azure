import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { add } from "../../src/add/index.js";

/**
 * `service.json` for one version. `extraCreateProp` lets a later version change the create body so
 * the diff detects a contract change; `withReplace` adds a brand-new operation.
 */
function swagger(extraCreateProp: boolean, withReplace: boolean): Record<string, any> {
  const paths: Record<string, any> = {
    "/subscriptions/{subscriptionId}/providers/Microsoft.Test/things/{id}": {
      parameters: [{ name: "subscriptionId", in: "path", type: "string" }],
      get: {
        operationId: "Things_Get",
        parameters: [
          { name: "id", in: "path", type: "string" },
          { name: "api-version", in: "query", type: "string" },
        ],
        responses: { "200": { schema: { $ref: "#/definitions/Thing" } } },
      },
      put: {
        operationId: "Things_Create",
        parameters: [
          { name: "id", in: "path", type: "string" },
          { name: "api-version", in: "query", type: "string" },
          { name: "resource", in: "body", schema: { $ref: "#/definitions/ThingCreate" } },
        ],
        responses: { "200": { schema: { $ref: "#/definitions/Thing" } } },
      },
    },
  };

  if (withReplace) {
    paths["/subscriptions/{subscriptionId}/providers/Microsoft.Test/things/{id}/replace"] = {
      post: {
        operationId: "Things_Replace",
        parameters: [
          { name: "subscriptionId", in: "path", type: "string" },
          { name: "id", in: "path", type: "string" },
          { name: "api-version", in: "query", type: "string" },
          { name: "resource", in: "body", schema: { $ref: "#/definitions/Thing" } },
        ],
        responses: { "200": { schema: { $ref: "#/definitions/Thing" } } },
      },
    };
  }

  const createProps: Record<string, unknown> = { name: { type: "string" } };
  if (extraCreateProp) createProps.sku = { type: "string" };

  return {
    swagger: "2.0",
    info: { title: "Test", version: "1.0" },
    paths,
    definitions: {
      Thing: { type: "object", properties: { name: { type: "string" } } },
      ThingCreate: { type: "object", properties: createProps },
    },
  };
}

const serviceYaml = `
versions:
  - version: "2023-01-01"
    source: typespec
  - version: "2023-06-01"
    source: typespec
  - version: "2024-01-01"
    source: typespec
`;

// examples.yaml as it would exist after migrating the first two versions.
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

const roots: string[] = [];

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "examples-add-"));
  roots.push(root);
  const versions: [string, boolean, boolean][] = [
    ["stable/2023-01-01", false, false],
    ["stable/2023-06-01", false, false],
    ["stable/2024-01-01", true, true], // create changed + Things_Replace added
  ];
  for (const [rel, extra, withReplace] of versions) {
    const dir = join(root, rel);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "service.json"), JSON.stringify(swagger(extra, withReplace)));
  }
  await writeFile(join(root, "service.yaml"), serviceYaml);
  await writeFile(join(root, "examples.yaml"), examplesYaml);
  return root;
}

describe("add (end-to-end)", () => {
  it("adds examples only for new and changed operations", async () => {
    const root = await fixture();
    const result = await add(root);

    expect(result.targetVersion).toBe("2024-01-01");
    expect(result.previousVersion).toBe("2023-06-01");

    const byKey = new Map(result.added.map((a) => [a.operationKey, a]));
    // Things.create changed (body gained `sku`) -> cloned since-variant.
    expect(byKey.get("Things.create")?.kind).toBe("changed");
    expect(byKey.get("Things.create")?.cloned).toBe(true);
    // Things.replace is brand new -> skeleton.
    expect(byKey.get("Things.replace")?.kind).toBe("new-operation");
    expect(byKey.get("Things.replace")?.cloned).toBe(false);
    // Things.get is unchanged -> not touched.
    expect(byKey.has("Things.get")).toBe(false);

    const doc = parse(result.files[0].content);

    // Get untouched: still a single base entry.
    expect(doc["Things.get"]).toHaveLength(1);
    expect(doc["Things.get"][0].since).toBeUndefined();

    // Create: base entry kept, new since:2024-01-01 variant cloned from the base.
    expect(doc["Things.create"]).toHaveLength(2);
    expect(doc["Things.create"][0].since).toBeUndefined();
    expect(doc["Things.create"][1].since).toBe("2024-01-01");
    expect(doc["Things.create"][1].request.body).toEqual({ name: "created" });
    expect(doc["Things.create"][1].responses["200"].body).toEqual({ name: "created" });

    // Replace: brand-new lineage with a since:2024-01-01 skeleton shaped from the schema.
    expect(doc["Things.replace"]).toHaveLength(1);
    expect(doc["Things.replace"][0].since).toBe("2024-01-01");
    expect(doc["Things.replace"][0].request.path).toEqual({ subscriptionId: "", id: "" });
    expect(doc["Things.replace"][0].request.body).toEqual({ name: "" });
    expect(doc["Things.replace"][0].responses["200"].body).toEqual({ name: "" });
  });

  it("is idempotent — a second run adds nothing", async () => {
    const root = await fixture();
    const first = await add(root);
    // Apply the first run's output.
    for (const file of first.files) {
      await writeFile(join(root, file.path), file.content);
    }
    const second = await add(root);
    expect(second.added).toEqual([]);
    expect(second.files).toEqual([]);
  });
});

afterAll(() => {
  void roots;
});
