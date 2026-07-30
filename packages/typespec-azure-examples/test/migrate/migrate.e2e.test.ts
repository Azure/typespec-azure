import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadExampleFile } from "../../src/loader.js";
import { migrate } from "../../src/migrate/index.js";
import { validateExampleFiles } from "../../src/validate.js";

const swagger = (version: string) => ({
  swagger: "2.0",
  info: { title: "Test", version },
  parameters: { SubscriptionIdParameter: { name: "subscriptionId", in: "path" } },
  paths: {
    "/subscriptions/{subscriptionId}/providers/Microsoft.Test/things/{id}": {
      parameters: [{ $ref: "#/parameters/SubscriptionIdParameter" }],
      get: {
        operationId: "Things_Get",
        parameters: [
          { name: "id", in: "path" },
          { name: "api-version", in: "query" },
        ],
        "x-ms-examples": { Get: { $ref: "./examples/Get.json" } },
      },
      put: {
        operationId: "Things_Create",
        parameters: [
          { name: "id", in: "path" },
          { name: "resource", in: "body" },
        ],
        "x-ms-examples": { Create: { $ref: "./examples/Create.json" } },
      },
    },
  },
});

const getExample = (version: string) => ({
  operationId: "Things_Get",
  parameters: { subscriptionId: "sub", id: "1", "api-version": version },
  responses: {
    "200": { body: { name: "thing", nextLink: `https://host/things?api-version=${version}` } },
  },
});

const createExample = (sku: string) => ({
  operationId: "Things_Create",
  parameters: { subscriptionId: "sub", id: "1", "api-version": "ignored", resource: { sku } },
  responses: { "200": { body: { sku } } },
});

async function writeVersion(root: string, version: string, sku: string): Promise<void> {
  const dir = join(root, "stable", version);
  await mkdir(join(dir, "examples"), { recursive: true });
  await writeFile(join(dir, "service.json"), JSON.stringify(swagger(version)));
  await writeFile(join(dir, "examples", "Get.json"), JSON.stringify(getExample(version)));
  await writeFile(join(dir, "examples", "Create.json"), JSON.stringify(createExample(sku)));
}

const roots: string[] = [];
async function buildFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "examples-migrate-"));
  roots.push(root);
  await writeVersion(root, "2023-01-01", "basic");
  await writeVersion(root, "2024-06-01", "premium");
  return root;
}

describe("migrate (end-to-end)", () => {
  it("produces a valid, collapsed examples.yaml", async () => {
    const root = await buildFixture();
    const result = await migrate(root);

    expect(result.namespace).toBe("Microsoft.Test");
    expect(result.operationCount).toBe(2);
    expect(result.files.map((f) => f.path)).toEqual(["examples.yaml"]);

    // The generated output must pass the validator with no errors.
    const diagnostics = validateExampleFiles(
      result.files.map((f) => loadExampleFile(f.path, f.content)),
      { serviceVersions: result.versions },
    );
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);

    const doc = parse(result.files[0].content);
    expect(doc.$namespace).toBe("Microsoft.Test");

    // Get collapses across versions (api-version normalized) into one base entry.
    expect(doc["Things.get"]).toHaveLength(1);
    expect(doc["Things.get"][0].since).toBeUndefined();
    expect(doc["Things.get"][0].responses["200"].body.nextLink).toContain("{api-version}");
    expect(doc["Things.get"][0].request.path).toEqual({ subscriptionId: "sub", id: "1" });

    // Create changed content across versions -> base + since variant.
    expect(doc["Things.create"]).toHaveLength(2);
    expect(doc["Things.create"][0].since).toBeUndefined();
    expect(doc["Things.create"][0].request.body).toEqual({ sku: "basic" });
    expect(doc["Things.create"][1].since).toBe("2024-06-01");
    expect(doc["Things.create"][1].request.body).toEqual({ sku: "premium" });
  });

  it("can split output by interface", async () => {
    const root = await buildFixture();
    const result = await migrate(root, { splitByInterface: true });
    expect(result.files.map((f) => f.path)).toEqual(["examples/Things.yaml"]);
  });
});

afterAll(() => {
  // Temp dirs live under the OS tmp dir; leave cleanup to the OS to avoid racy rm on CI.
  void roots;
});
