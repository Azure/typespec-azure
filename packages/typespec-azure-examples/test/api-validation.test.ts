import { describe, expect, it } from "vitest";
import { loadExampleFile } from "../src/loader.js";
import { validateApiExamples } from "../src/validate-api.js";

const contract = {
  swagger: "2.0",
  info: { version: "2024-01-01" },
  definitions: {
    Widget: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" }, count: { type: "integer", minimum: 0 } },
    },
  },
  paths: {
    "/widgets/{id}": {
      parameters: [{ name: "id", in: "path", required: true, type: "integer" }],
      put: {
        operationId: "Widgets_Create",
        parameters: [
          { name: "id", in: "path", required: true, type: "string" },
          { name: "api-version", in: "query", required: true, type: "string" },
          {
            name: "resource",
            in: "body",
            required: true,
            schema: { $ref: "#/definitions/Widget" },
          },
        ],
        responses: {
          200: {
            schema: { $ref: "#/definitions/Widget" },
            headers: { "Retry-After": { type: "integer" } },
          },
          204: { description: "No content" },
        },
      },
    },
  },
};

async function validate(content: string) {
  return validateApiExamples(
    [loadExampleFile("examples.yaml", content)],
    new Map([["/spec/stable/2024-01-01/openapi.json", contract]]),
    ["2024-01-01"],
  );
}

describe("API-aware example validation", () => {
  it("accepts matching wire values, implicit api-version and case-insensitive HTTP headers", async () => {
    expect(
      await validate(`
Widgets.create:
  - request:
      path: { id: "1" }
      body: { name: example, count: 1 }
    responses:
      200:
        headers: { retry-after: 3 }
        body: { name: example, count: 1 }
`),
    ).toEqual([]);
  });

  it("reports required parameters, wrong locations and incompatible body/header values at YAML locations", async () => {
    const diagnostics = await validate(`
Widgets.create:
  - request:
      query: { id: "1" }
      body: { name: 123, count: -1 }
    responses:
      200:
        headers: { Retry-After: nope }
        body: {}
`);
    expect(diagnostics.every((diagnostic) => diagnostic.severity === "error")).toBe(true);
    expect(diagnostics.every((diagnostic) => diagnostic.file === "examples.yaml")).toBe(true);
    expect(diagnostics.every((diagnostic) => diagnostic.line !== undefined)).toBe(true);
    const messages = diagnostics.map((diagnostic) => diagnostic.message).join("\n");
    expect(messages).toContain("2024-01-01");
    expect(messages).toContain("request.path.id");
    expect(messages).toContain("request.query.id");
    expect(messages).toContain("request.body.name");
    expect(messages).toContain("request.body.count");
    expect(messages).toContain("responses.200.headers.Retry-After");
    expect(messages).toContain("responses.200.body.name");
  });

  it("rejects unsupported statuses and bodies on bodyless responses", async () => {
    const diagnostics = await validate(`
Widgets.create:
  - request: { path: { id: "1" }, body: { name: example } }
    responses:
      201: {}
      204: { body: { name: example } }
`);
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain(
      "responses.201",
    );
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain(
      "responses.204.body",
    );
  });

  it("validates required form fields without treating form bodies as unsupported", async () => {
    const operation = contract.paths["/widgets/{id}"].put;
    const document = {
      ...contract,
      paths: {
        "/widgets": {
          post: {
            ...operation,
            parameters: [
              { in: "formData", name: "label", required: true, type: "string" },
              { in: "formData", name: "count", type: "integer" },
            ],
          },
        },
      },
    };
    const diagnostics = await validateApiExamples(
      [
        loadExampleFile(
          "examples.yaml",
          `
Widgets.create:
  - request: { body: { count: invalid } }
    responses: { 204: {} }
`,
        ),
      ],
      new Map([["/spec/openapi.json", document]]),
      ["2024-01-01"],
    );
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain(
      "request.body.count",
    );
    expect(diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain(
      "request.body.label",
    );
  });

  it.each(["Widgets.missing", "widgets.create"])(
    "reports an unknown canonical operation key (%s)",
    async (operation) => {
      const diagnostics = await validate(`
${operation}:
  - request: {}
    responses: { 200: {} }
`);
      expect(diagnostics).toMatchObject([
        { code: "unknown-example-operation", operation, severity: "error" },
      ]);
    },
  );

  it("reports unresolved contract references as errors, not successful validation", async () => {
    const operation = contract.paths["/widgets/{id}"].put;
    const document = {
      ...contract,
      paths: {
        "/widgets": {
          put: { ...operation, parameters: [{ $ref: "#/parameters/Missing" }] },
        },
      },
    };
    const diagnostics = await validateApiExamples(
      [
        loadExampleFile(
          "examples.yaml",
          `
Widgets.create:
  - request: {}
    responses: { 204: {} }
`,
        ),
      ],
      new Map([["/spec/openapi.json", document]]),
      ["2024-01-01"],
    );
    expect(diagnostics).toMatchObject([
      { code: "example-schema-error", severity: "error", file: "examples.yaml" },
    ]);
    expect(diagnostics[0].message).toContain("#/parameters/Missing");
  });

  it("honors read-only request fields, secret response fields, and nullable wire values", async () => {
    const document = {
      ...contract,
      definitions: {
        Widget: {
          type: "object",
          required: ["name", "id", "secret"],
          properties: {
            name: { type: "string", "x-nullable": true },
            id: { type: "string", readOnly: true },
            secret: { type: "string", "x-ms-secret": true },
          },
        },
      },
    };
    expect(
      await validateApiExamples(
        [
          loadExampleFile(
            "examples.yaml",
            `
Widgets.create:
  - request: { path: { id: "1" }, body: { name: null, secret: example } }
    responses: { 200: { body: { id: "1", name: null } } }
`,
          ),
        ],
        new Map([["/spec/openapi.json", document]]),
        ["2024-01-01"],
      ),
    ).toEqual([]);
  });

  it("accepts future values of open enums without weakening closed enums", async () => {
    const document = {
      ...contract,
      definitions: {
        Widget: {
          type: "object",
          properties: {
            open: {
              type: "string",
              enum: ["Known"],
              "x-ms-enum": { modelAsString: true },
            },
            closed: {
              type: "string",
              enum: ["Known"],
              "x-ms-enum": { modelAsString: false },
            },
          },
        },
      },
    };
    const diagnostics = await validateApiExamples(
      [
        loadExampleFile(
          "examples.yaml",
          `
Widgets.create:
  - request: { path: { id: "1" }, body: { open: Future, closed: Known } }
    responses: { 200: { body: { open: Future, closed: Invalid } } }
`,
        ),
      ],
      new Map([["/spec/openapi.json", document]]),
      ["2024-01-01"],
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("responses.200.body.closed");
  });

  it("resolves external body parameters and schemas relative to the parameter document", async () => {
    const operation = contract.paths["/widgets/{id}"].put;
    const document = {
      ...contract,
      paths: {
        "/widgets/{id}": {
          put: {
            ...operation,
            parameters: [
              ...operation.parameters.slice(0, 2),
              { $ref: "../../common/parameters.json#/parameters/Resource" },
            ],
          },
        },
      },
    };
    const common = {
      parameters: {
        Resource: {
          name: "resource",
          in: "body",
          required: true,
          schema: { $ref: "#/definitions/Widget" },
        },
      },
      definitions: { Widget: { type: "object", properties: { name: { type: "integer" } } } },
    };
    const diagnostics = await validateApiExamples(
      [
        loadExampleFile(
          "examples.yaml",
          `
Widgets.create:
  - request: { path: { id: "1" }, body: { name: not-an-integer } }
    responses: { 204: {} }
`,
        ),
      ],
      new Map<string, Record<string, unknown>>([
        ["/spec/stable/2024-01-01/openapi.json", document],
        ["/spec/common/parameters.json", common],
      ]),
      ["2024-01-01"],
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("request.body.name");
    expect(diagnostics[0].message).toContain("integer");
  });

  it("rejects misspelled model fields while accepting inherited fields and typed dictionaries", async () => {
    const document = {
      ...contract,
      definitions: {
        Base: { type: "object", properties: { name: { type: "string" } } },
        Widget: {
          type: "object",
          allOf: [{ $ref: "#/definitions/Base" }],
          properties: {
            counters: { type: "object", additionalProperties: { type: "integer" } },
          },
        },
      },
    };
    const diagnostics = await validateApiExamples(
      [
        loadExampleFile(
          "examples.yaml",
          `
Widgets.create:
  - request:
      path: { id: "1" }
      body: { name: inherited, counters: { first: 1 } }
    responses:
      200:
        body: { name: inherited, counters: { first: 1 }, typo: unexpected }
`,
        ),
      ],
      new Map([["/spec/openapi.json", document]]),
      ["2024-01-01"],
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("responses.200.body");
    expect(diagnostics[0].message).toContain("unevaluated");
  });

  it("validates the selected since variant against each version's contract", async () => {
    const later = {
      ...contract,
      info: { version: "2025-01-01" },
      definitions: {
        Widget: { type: "object", required: ["count"], properties: { count: { type: "integer" } } },
      },
    };
    const diagnostics = await validateApiExamples(
      [
        loadExampleFile(
          "examples.yaml",
          `
Widgets.create:
  - request: { path: { id: "1" }, body: { name: before } }
    responses: { 200: { body: { name: before } } }
  - since: "2025-01-01"
    request: { path: { id: "1" }, body: { count: 2 } }
    responses: { 200: { body: { count: two } } }
`,
        ),
      ],
      new Map([
        ["/spec/stable/2024-01-01/openapi.json", contract],
        ["/spec/stable/2025-01-01/openapi.json", later],
      ]),
      ["2024-01-01", "2025-01-01"],
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("2025-01-01");
    expect(diagnostics[0].message).toContain("responses.200.body.count");
  });
});
