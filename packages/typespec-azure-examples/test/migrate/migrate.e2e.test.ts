import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadExampleFile } from "../../src/loader.js";
import { migrate } from "../../src/migrate/index.js";
import { resolveLegacyExamples } from "../../src/resolve/legacy.js";
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
  it("resolves nested external parameter refs for migration and legacy expansion", async () => {
    const root = await mkdtemp(join(tmpdir(), "examples-external-params-"));
    roots.push(root);
    await writeVersion(root, "2023-01-01", "basic");
    await mkdir(join(root, "common"));
    await writeFile(
      join(root, "common", "nested.json"),
      JSON.stringify({ parameters: { Sub: { name: "subscriptionId", in: "path" } } }),
    );
    await writeFile(
      join(root, "common", "parameters.json"),
      JSON.stringify({
        parameters: {
          "Subscription/Id": { $ref: "nested.json#/parameters/Sub" },
          Resource: { name: "resource", in: "body" },
        },
      }),
    );
    const original = swagger("2023-01-01");
    const [path, pathItem] = Object.entries(original.paths)[0];
    const doc = {
      ...original,
      paths: {
        [path]: {
          ...pathItem,
          parameters: [{ $ref: "../../common/parameters.json#/parameters/Subscription~1Id" }],
          put: {
            ...pathItem.put,
            parameters: [
              { name: "id", in: "path" },
              { $ref: "../../common/parameters.json#/parameters/Resource" },
            ],
          },
        },
      },
    };
    await writeFile(join(root, "stable", "2023-01-01", "service.json"), JSON.stringify(doc));
    await writeVersion(root, "2024-06-01", "premium");
    const later = swagger("2024-06-01");
    Object.values(later.paths)[0].put.parameters[1].name = "payload";
    await writeFile(join(root, "stable", "2024-06-01", "service.json"), JSON.stringify(later));
    await writeFile(
      join(root, "stable", "2024-06-01", "examples", "Create.json"),
      JSON.stringify({
        operationId: "Things_Create",
        parameters: { subscriptionId: "sub", id: "1", payload: { sku: "premium" } },
        responses: { "200": { body: { sku: "premium" } } },
      }),
    );
    await writeFile(
      join(root, "service.yaml"),
      'versions:\n  - version: "2023-01-01"\n  - version: "2024-06-01"\n',
    );

    const result = await migrate(root);
    const migrated = parse(result.files[0].content);
    expect(migrated["Things.create"][0].request).toEqual({
      path: { subscriptionId: "sub", id: "1" },
      body: { sku: "basic" },
    });
    await writeFile(join(root, "examples.yaml"), result.files[0].content);
    const expanded = await resolveLegacyExamples(root, "2023-01-01");
    expect(expanded.diagnostics).toEqual([]);
    expect(expanded.files.find((file) => file.fileName === "Create.json")?.document).toMatchObject({
      parameters: { subscriptionId: "sub", id: "1", resource: { sku: "basic" } },
    });
    const laterExpanded = await resolveLegacyExamples(root, "2024-06-01");
    expect(
      laterExpanded.files.find((file) => file.fileName === "Create.json")?.document,
    ).toMatchObject({ parameters: { payload: { sku: "premium" } } });
  });

  it("fails explicitly for an unresolved external parameter rather than guessing query", async () => {
    const root = await buildFixture();
    const doc = swagger("2023-01-01");
    Object.values(doc.paths)[0].parameters = [
      { $ref: "../../missing.json#/parameters/SubscriptionId" },
    ];
    await writeFile(join(root, "stable", "2023-01-01", "service.json"), JSON.stringify(doc));
    await expect(migrate(root)).rejects.toThrow(/missing\.json/);
  });

  it("reports circular parameter references instead of recursing indefinitely", async () => {
    const root = await buildFixture();
    const doc = {
      ...swagger("2023-01-01"),
      parameters: { SubscriptionIdParameter: { $ref: "#/parameters/SubscriptionIdParameter" } },
    };
    await writeFile(join(root, "stable", "2023-01-01", "service.json"), JSON.stringify(doc));
    await expect(migrate(root)).rejects.toThrow(/Circular parameter reference/);
  });

  it("preserves payload field order through YAML and legacy expansion for each version", async () => {
    const root = await buildFixture();
    const versions = ["2023-01-01", "2024-06-01"];
    const bodies = [
      { zeta: "last", nested: { second: 2, first: 1 }, items: [{ value: 1, name: "item" }] },
      { items: [{ name: "item", value: 1 }], nested: { first: 1, second: 2 }, zeta: "last" },
    ];
    const originals = versions.map((version, index) => ({
      title: "Create",
      operationId: "Things_Create",
      parameters: {
        "api-version": version,
        subscriptionId: "sub",
        id: "1",
        resource: bodies[index],
      },
      responses: {
        "200":
          index === 0
            ? { body: bodies[index], headers: { "x-second": "2", "x-first": "1" } }
            : { headers: { "x-first": "1", "x-second": "2" }, body: bodies[index] },
      },
    }));
    for (const [index, version] of versions.entries()) {
      await writeFile(
        join(root, "stable", version, "examples", "Create.json"),
        JSON.stringify(originals[index]),
      );
    }
    await writeFile(
      join(root, "service.yaml"),
      'versions:\n  - version: "2023-01-01"\n  - version: "2024-06-01"\n',
    );

    const result = await migrate(root);
    expect(result.diagnostics).toEqual([]);
    expect(parse(result.files[0].content)["Things.create"]).toHaveLength(2);
    await writeFile(join(root, "examples.yaml"), result.files[0].content);

    for (const [index, version] of versions.entries()) {
      const expanded = await resolveLegacyExamples(root, version);
      expect(expanded.diagnostics).toEqual([]);
      const document = expanded.files.find((file) => file.fileName === "Create.json")?.document;
      expect(JSON.stringify(document)).toBe(JSON.stringify(originals[index]));
    }
  });

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
    expect(doc["Things.get"][0].id).toBe("Get");
    expect(doc["Things.get"][0].responses["200"].body.nextLink).toContain("{api-version}");
    expect(doc["Things.get"][0].request.path).toEqual({ subscriptionId: "sub", id: "1" });

    // Create changed content across versions -> base + since variant.
    expect(doc["Things.create"]).toHaveLength(2);
    expect(doc["Things.create"][0].since).toBeUndefined();
    expect(doc["Things.create"][0].id).toBe("Create");
    expect(doc["Things.create"][0].request.body).toEqual({ sku: "basic" });
    expect(doc["Things.create"][1].since).toBe("2024-06-01");
    expect(doc["Things.create"][1].request.body).toEqual({ sku: "premium" });
  });

  it("can split output by interface", async () => {
    const root = await buildFixture();
    const result = await migrate(root, { splitByInterface: true });
    expect(result.files.map((f) => f.path)).toEqual(["examples/Things.yaml"]);
  });

  it("ignores on-disk versions absent from the authoritative version order", async () => {
    const root = await buildFixture();
    // An extra swagger version exists on disk but is not part of the service's version list.
    await writeVersion(root, "2025-07-15-preview", "unofficial");

    const versionOrder = ["2023-01-01", "2024-06-01"];
    const result = await migrate(root, { versionOrder });

    // The unofficial version is not reported and never surfaces as a `since` value.
    expect(result.versions).toEqual(versionOrder);
    const doc = parse(result.files[0].content);
    const sinceVersions = doc["Things.create"].map((v: { since?: string }) => v.since);
    expect(sinceVersions).not.toContain("2025-07-15-preview");
    expect(doc["Things.create"]).toHaveLength(2);

    // Output still validates against the authoritative version list.
    const diagnostics = validateExampleFiles(
      result.files.map((f) => loadExampleFile(f.path, f.content)),
      { serviceVersions: result.versions },
    );
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  });

  it("has no removal warnings when every example carries to the latest version", async () => {
    const root = await buildFixture();
    const result = await migrate(root);
    expect(result.diagnostics).toEqual([]);
  });

  it("warns when an example is dropped before the latest version", async () => {
    const root = await mkdtemp(join(tmpdir(), "examples-migrate-"));
    roots.push(root);
    // 2023-01-01 has both Get and Create; 2024-06-01 drops Create entirely.
    await writeVersion(root, "2023-01-01", "basic");
    const laterDir = join(root, "stable", "2024-06-01");
    await mkdir(join(laterDir, "examples"), { recursive: true });
    const getOnly = swagger("2024-06-01");
    delete (getOnly.paths as Record<string, Record<string, unknown>>)[
      "/subscriptions/{subscriptionId}/providers/Microsoft.Test/things/{id}"
    ].put;
    await writeFile(join(laterDir, "service.json"), JSON.stringify(getOnly));
    await writeFile(
      join(laterDir, "examples", "Get.json"),
      JSON.stringify(getExample("2024-06-01")),
    );

    const result = await migrate(root);
    const removal = result.diagnostics.filter((d) => d.code === "example-removed-before-latest");
    expect(removal).toHaveLength(1);
    expect(removal[0].severity).toBe("warning");
    expect(removal[0].message).toContain("Things.create");
    expect(removal[0].message).toContain("2023-01-01");
    expect(removal[0].message).toContain("2024-06-01");
    // Get is present in the latest version, so it must not be flagged.
    expect(removal[0].message).not.toContain("Things.get");
  });
});

afterAll(() => {
  // Temp dirs live under the OS tmp dir; leave cleanup to the OS to avoid racy rm on CI.
  void roots;
});
