import { describe, expect, it } from "vitest";
import { loadExampleFile } from "../../src/loader.js";
import { getExampleFilename } from "../../src/naming.js";
import { resolveExampleFiles } from "../../src/resolve/resolve.js";

const order = ["2023-01-01", "2024-06-01"];

function resolve(content: string, apiVersion: string) {
  return resolveExampleFiles([loadExampleFile("examples.yaml", content)], apiVersion, order);
}

describe("resolveExampleFiles", () => {
  const doc = `
Things.get:
  - request: { path: { id: "1" } }
    responses:
      200:
        body: { nextLink: "https://h/x?api-version={api-version}", tier: base }
  - since: "2024-06-01"
    request: { path: { id: "1" } }
    responses:
      200:
        body: { nextLink: "https://h/x?api-version={api-version}", tier: premium }
`;

  it("resolves the base entry and materializes the api-version for an early target", () => {
    const result = resolve(doc, "2023-01-01");
    expect(result.diagnostics).toEqual([]);
    expect(result.examples).toHaveLength(1);
    const example = result.examples[0] as any;
    expect(example.operation).toBe("Things.get");
    expect(example.responses["200"].body.tier).toBe("base");
    expect(example.responses["200"].body.nextLink).toBe("https://h/x?api-version=2023-01-01");
  });

  it("resolves the since entry for the later target", () => {
    const example = resolve(doc, "2024-06-01").examples[0] as any;
    expect(example.responses["200"].body.tier).toBe("premium");
    expect(example.responses["200"].body.nextLink).toBe("https://h/x?api-version=2024-06-01");
  });

  it("emits one resolved example per lineage (title)", () => {
    const multi = `
Foo.create:
  - title: With WebHook
    request: { path: {} }
    responses: { 200: { body: { kind: webhook } } }
  - title: With Queue
    request: { path: {} }
    responses: { 200: { body: { kind: queue } } }
`;
    const result = resolve(multi, "2023-01-01");
    expect(result.examples.map((e) => e.title).sort()).toEqual(["With Queue", "With WebHook"]);
  });

  it("omits a lineage that has no applicable entry at the target", () => {
    const laterOnly = `
Foo.get:
  - since: "2024-06-01"
    request: { path: {} }
    responses: { 200: {} }
`;
    expect(resolve(laterOnly, "2023-01-01").examples).toEqual([]);
  });

  it("reports an error when the target version is unknown", () => {
    const result = resolve(doc, "2099-01-01");
    expect(result.diagnostics.map((d) => d.code)).toContain("unknown-target-version");
    expect(result.examples).toEqual([]);
  });

  it("selects one ID lineage when its display title changes between versions", () => {
    const result = resolve(
      `
Things.get:
  - id: GetThing
    title: Original title
    request: {}
    responses: { 200: { body: { tier: base } } }
  - id: GetThing
    title: Updated title
    since: "2024-06-01"
    request: {}
    responses: { 200: { body: { tier: premium } } }
`,
      "2024-06-01",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.examples).toMatchObject([
      {
        id: "GetThing",
        title: "Updated title",
        legacyFilename: "GetThing.json",
        responses: { 200: { body: { tier: "premium" } } },
      },
    ]);
    expect(result.examples).toHaveLength(1);
    expect(getExampleFilename("Things_Get", result.examples[0])).toBe("GetThing.json");
  });

  it("reports duplicate IDs instead of resolving colliding output names", () => {
    const result = resolve(
      `
Things.get:
  - id: Shared
    request: {}
    responses: { 200: {} }
Others.get:
  - id: Shared
    request: {}
    responses: { 200: {} }
`,
      "2023-01-01",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "duplicate-example-id",
    );
    expect(result.examples).toEqual([]);
  });

  it("does not silently select one of two base variants sharing an ID", () => {
    const result = resolve(
      `
Things.get:
  - id: GetThing
    title: First title
    request: {}
    responses: { 200: {} }
  - id: GetThing
    title: Second title
    request: {}
    responses: { 200: {} }
`,
      "2023-01-01",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "multiple-base-variants",
    );
    expect(result.examples).toEqual([]);
  });
});
