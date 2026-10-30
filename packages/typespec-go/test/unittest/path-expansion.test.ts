import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("path expansion helper emission", () => {
  it.each([
    { expansion: "filter", member: "values: string[]", parameter: "filter: Filter" },
    { expansion: "filter*", member: "values?: string[]", parameter: "filter: Filter" },
    { expansion: "filter", member: "values: string[] | null", parameter: "filter?: Filter" },
    { expansion: "filter*", member: "values: string[]", parameter: "filter?: Filter" },
  ])(
    "rejects array-valued query object members: $expansion, $member",
    async ({ expansion, member, parameter }) => {
      await expect(
        emitGoFor(`
        @service
        namespace Expansions;
        model BaseFilter { ${member}; }
        model Filter extends BaseFilter { count?: int32; }
        @route("/query{?${expansion}}")
        op read(${parameter}): void;
      `),
      ).rejects.toThrow("query objects cannot contain array-valued fields");
    },
  );

  it("does not emit payload models or serde for query parameter groups", async () => {
    const files = await emitGoFor(`
      @service
      namespace Expansions;
      model BaseFilter { field: string; }
      model Filter extends BaseFilter { count?: int32; }
      @route("/required{?filter*}")
      op required(filter: Filter): void;
      @route("/optional{?filter}")
      op optional(filter?: Filter): void;
    `);
    expect(files.has("zz_models.go")).toBe(false);
    expect(files.has("zz_models_serde.go")).toBe(false);
    expect(files.has("zz_options.go")).toBe(true);
  });

  it.each([
    '@post @route("/body") op body(@body payload: Filter): void;',
    '@post @route("/body") op body(@body payload: Payload): void;',
    '@get @route("/response") op response(): Filter;',
    '@get @route("/response") op response(): Payload;',
    '@get @route("/response") op response(): Filter[];',
    '@get @route("/response") op response(): Record<Filter>;',
    'model Derived extends Filter {} @get @route("/response") op response(): Derived;',
    '@error model Failure { filter: Filter; } @get @route("/failure") op failure(): Failure;',
    'namespace Nested { @get @route("/response") op response(): Payload; }',
  ])("rejects bundled query models reused in request/response bodies: %s", async (operation) => {
    await expect(
      emitGoFor(`
      @service
      namespace Expansions;
      model Filter { count: int32; }
      model Payload { filter: Filter; }
      @route("/query{?filter*}")
      op query(filter: Filter): void;
      ${operation}
    `),
    ).rejects.toThrow(
      "model Filter cannot be used for both bundled query parameters and request/response bodies",
    );
  });

  it("rejects body reuse of an optional query object", async () => {
    await expect(
      emitGoFor(`
      @service
      namespace Expansions;
      model Filter { count?: int32; }
      @route("/query{?filter}")
      op query(filter?: Filter): void;
      @post @route("/body")
      op body(@body payload: Filter): void;
    `),
    ).rejects.toThrow(
      "model Filter cannot be used for both bundled query parameters and request/response bodies",
    );
  });

  it("allows a query model's base to be used independently in a body", async () => {
    const files = await emitGoFor(`
      @service
      namespace Expansions;
      model BaseFilter { field: string; }
      model Filter extends BaseFilter { count: int32; }
      @route("/query{?filter*}")
      op query(filter: Filter): void;
      @post @route("/body")
      op body(@body payload: BaseFilter): void;
    `);
    expect(files.has("zz_models.go")).toBe(true);
    expect(files.has("zz_models_serde.go")).toBe(true);
  });

  it.each([
    { location: "path", collection: "(int32 | null)[]" },
    { location: "query", collection: "(int32 | null)[]" },
    { location: "path", collection: "Record<int32 | null>" },
    { location: "query", collection: "Record<int32 | null>" },
  ])("rejects nullable entries in $location $collection", async ({ location, collection }) => {
    await expect(
      emitGoFor(`
      @service
      namespace Expansions;
      @route("/items")
      op read(@${location} value: ${collection}): void;
    `),
    ).rejects.toThrow("nullable entries in path/query collections are not supported");
  });

  it.each([
    { name: "scalar paths", parameter: "@path value: string", required: false },
    {
      name: "reserved scalar paths",
      parameter: "@path(#{ allowReserved: true }) value: string",
      required: false,
    },
    { name: "query arrays", parameter: "@query value: string[]", required: false },
    { name: "path arrays", parameter: "@path value: string[]", required: true },
    { name: "path maps", parameter: "@path value: Record<int32>", required: true },
  ])("emits helpers when needed for $name", async ({ parameter, required }) => {
    const files = await emitGoFor(`
      @service
      namespace Expansions;
      @route("/items")
      op read(${parameter}): void;
    `);
    expect(files.has("zz_path_helpers.go")).toBe(required);
  });

  it("places helpers in the containing package with the configured file prefix", async () => {
    const files = await emitGoFor(
      `
        @service
        namespace Expansions;
        @route("/items{/values*}")
        op read(values: string[]): void;
      `,
      {
        "containing-module": "example.com/parent",
        "emitter-output-dir": "{output-dir}/child",
        "file-prefix": "generated",
      },
    );
    expect(files.has("child/generated_path_helpers.go")).toBe(true);
  });

  it.each([
    { parameter: "value: Record<int32>", expansion: "value", helpers: true, preserve: false },
    { parameter: "value?: Record<int32>", expansion: "value", helpers: true, preserve: true },
    { parameter: "value: Filter", expansion: "value", helpers: true, preserve: false },
    { parameter: "value?: Filter", expansion: "value", helpers: true, preserve: true },
    { parameter: "value: OptionalFilter", expansion: "value", helpers: true, preserve: true },
    { parameter: "value: Filter", expansion: "value*", helpers: false, preserve: false },
    { parameter: "value: string[]", expansion: "value", helpers: false, preserve: false },
  ])(
    "selects query helpers for $parameter {$expansion}",
    async ({ parameter, expansion, helpers, preserve }) => {
      const files = await emitGoFor(`
      @service namespace Expansions;
      model Filter { field: string; }
      model OptionalFilter { field?: string; }
      @route("/query{?${expansion}}")
      op read(${parameter}): void;
    `);
      expect(files.has("zz_query_helpers.go")).toBe(helpers);
      expect(
        files.get("zz_query_helpers.go")?.includes("func preserveQueryExpansions") ?? false,
      ).toBe(preserve);
      const client = files.get("zz_expansions_client.go")!;
      expect(client.includes("preserveQueryExpansions(")).toBe(preserve);
    },
  );
});
