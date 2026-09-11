import { describe, expect, it } from "vitest";
import { loadExampleFile } from "../src/loader.js";
import type { ExampleDiagnostic } from "../src/types.js";
import { validateExampleFiles } from "../src/validate.js";

function validate(content: string, serviceVersions?: string[]): ExampleDiagnostic[] {
  return validateExampleFiles([loadExampleFile("examples.yaml", content)], { serviceVersions });
}

function codes(diagnostics: ExampleDiagnostic[]): string[] {
  return diagnostics.map((d) => d.code);
}

describe("valid files", () => {
  it("accepts a single-example operation", () => {
    const diagnostics = validate(`
$namespace: Microsoft.EventGrid
CaCertificates.get:
  - request:
      path:
        subscriptionId: sub
    responses:
      200:
        body: { name: cert }
`);
    expect(diagnostics).toEqual([]);
  });

  it("accepts a base + since lineage", () => {
    const diagnostics = validate(
      `
CaCertificates.get:
  - request: { path: { subscriptionId: sub } }
    responses: { 200: { body: { name: cert } } }
  - since: "2023-12-15-preview"
    request: { path: { subscriptionId: sub } }
    responses: { 200: { body: { name: cert } } }
`,
      ["2023-12-15-preview"],
    );
    expect(diagnostics).toEqual([]);
  });

  it("accepts the {api-version} placeholder", () => {
    const diagnostics = validate(`
Things.list:
  - request: { path: { subscriptionId: sub } }
    responses:
      200:
        body:
          nextLink: "https://host/things?api-version={api-version}"
`);
    expect(diagnostics).toEqual([]);
  });
});

describe("metadata keys", () => {
  it("rejects unknown $-prefixed metadata keys", () => {
    const diagnostics = validate(`
$unknown: value
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
`);
    expect(codes(diagnostics)).toContain("unknown-metadata-key");
  });

  it("rejects an operation that is not a list", () => {
    const diagnostics = validate(`
Foo.get:
  request: { path: {} }
`);
    expect(codes(diagnostics)).toContain("operation-not-a-list");
  });
});

describe("status codes", () => {
  it("rejects range keys like 2XX", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
    responses: { 2XX: { body: {} } }
`);
    expect(codes(diagnostics)).toContain("invalid-status-code");
  });

  it("rejects default", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
    responses: { default: { body: {} } }
`);
    expect(codes(diagnostics)).toContain("invalid-status-code");
  });

  it("accepts concrete numeric codes", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
    responses: { 200: {}, 404: {} }
`);
    expect(codes(diagnostics)).not.toContain("invalid-status-code");
  });
});

describe("since", () => {
  it("rejects an unquoted since", () => {
    const diagnostics = validate(
      `
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
  - since: 2024-06-01
    request: { path: {} }
    responses: { 200: {} }
`,
      ["2024-06-01"],
    );
    expect(codes(diagnostics)).toContain("unquoted-since");
  });

  it("accepts a quoted since", () => {
    const diagnostics = validate(
      `
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
  - since: "2024-06-01"
    request: { path: {} }
    responses: { 200: {} }
`,
      ["2024-06-01"],
    );
    expect(codes(diagnostics)).not.toContain("unquoted-since");
  });

  it("rejects a since not listed in service.yaml", () => {
    const diagnostics = validate(
      `
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
  - since: "2030-01-01"
    request: { path: {} }
    responses: { 200: {} }
`,
      ["2024-06-01"],
    );
    expect(codes(diagnostics)).toContain("unknown-since-version");
  });

  it("skips the membership check when no service versions are provided", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
  - since: "2030-01-01"
    request: { path: {} }
    responses: { 200: {} }
`);
    expect(codes(diagnostics)).not.toContain("unknown-since-version");
  });
});

describe("lineage", () => {
  it("rejects more than one base entry in a lineage", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
  - request: { path: {} }
    responses: { 200: {} }
`);
    expect(codes(diagnostics)).toContain("multiple-base-variants");
  });

  it("rejects duplicate since values in a lineage", () => {
    const diagnostics = validate(
      `
Foo.get:
  - request: { path: {} }
    responses: { 200: {} }
  - since: "2024-06-01"
    request: { path: {} }
    responses: { 200: {} }
  - since: "2024-06-01"
    request: { path: {} }
    responses: { 200: {} }
`,
      ["2024-06-01"],
    );
    expect(codes(diagnostics)).toContain("duplicate-since");
  });

  it("allows separate lineages disambiguated by title", () => {
    const diagnostics = validate(`
Foo.create:
  - title: With WebHook
    request: { path: {} }
    responses: { 200: {} }
  - title: With Queue
    request: { path: {} }
    responses: { 200: {} }
`);
    expect(codes(diagnostics)).not.toContain("multiple-base-variants");
  });
});

describe("placeholders and api-version", () => {
  it("rejects placeholders other than {api-version}", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
    responses:
      200:
        body: { url: "https://host/{region}/foo" }
`);
    expect(codes(diagnostics)).toContain("unsupported-placeholder");
  });

  it("rejects api-version written as a request parameter", () => {
    const diagnostics = validate(`
Foo.get:
  - request:
      query: { api-version: "2024-06-01" }
    responses: { 200: {} }
`);
    expect(codes(diagnostics)).toContain("explicit-api-version");
  });
});

describe("structural schema", () => {
  it("rejects a variant missing responses", () => {
    const diagnostics = validate(`
Foo.get:
  - request: { path: {} }
`);
    expect(codes(diagnostics)).toContain("schema-validation");
  });

  it("reports a fatal YAML parse error", () => {
    const diagnostics = validate(`Foo.get: [1, 2`);
    expect(codes(diagnostics)).toContain("yaml-parse-error");
  });
});
