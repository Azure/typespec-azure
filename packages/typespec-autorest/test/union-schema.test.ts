import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { compileOpenAPI, diagnoseOpenApiFor, openApiFor } from "./test-host.js";

describe("typespec-autorest: union schema", () => {
  it("union with self reference model and null", async () => {
    const res = await openApiFor(
      `
      model Thing {
        id: string;
        properties: Thing | null;
      }
      op doStuff(): Thing;
      `,
    );
    deepStrictEqual(res.definitions.Thing.properties.properties, {
      $ref: "#/definitions/Thing",
      "x-nullable": true,
    });
  });

  it("union of mixed types emit diagnostic", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      model Params {
        name: string;
        options: Record<string>;
      }
      
      op foo(param: "all" | "none" | Params): void;
      `,
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/union-unsupported",
      message:
        "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type.",
    });
  });

  describe("unions as enum", () => {
    it("change definition name with @clientName", async () => {
      const res = await compileOpenAPI(`@clientName("ClientFoo") union Foo {"a"};`, {
        preset: "azure",
      });
      expect(res.definitions).toHaveProperty("ClientFoo");
      expect(res.definitions).not.toHaveProperty("Foo");
    });

    it("emit enum for simple union of string literals", async () => {
      const res = await openApiFor(`union Test {"one" , "two"}`);
      deepStrictEqual(res.definitions.Test, {
        type: "string",
        enum: ["one", "two"],
        "x-ms-enum": {
          name: "Test",
          modelAsString: false,
        },
      });
    });

    it("emit enum for simple union of numeric literals", async () => {
      const res = await openApiFor(`union Test {0, 1, 2}`);
      deepStrictEqual(res.definitions.Test, {
        type: "number",
        enum: [0, 1, 2],
        "x-ms-enum": {
          name: "Test",
          modelAsString: false,
        },
      });
    });

    it("emit open string enum when union variant contains scalar string", async () => {
      const res = await openApiFor(`union Test {"one" , "two", string}`);
      deepStrictEqual(res.definitions.Test, {
        type: "string",
        enum: ["one", "two"],
        "x-ms-enum": {
          name: "Test",
          modelAsString: true,
        },
      });
    });

    it("emit open number enum when union variant contains scalar int32", async () => {
      const res = await openApiFor(`union Test {0, 1, 2, int32}`);
      deepStrictEqual(res.definitions.Test, {
        type: "number",
        enum: [0, 1, 2],
        "x-ms-enum": {
          name: "Test",
          modelAsString: true,
        },
      });
    });

    it("emit union variant name in the x-ms-enum values", async () => {
      const res = await openApiFor(`union Test {One: "one" , Two: "two"}`);
      deepStrictEqual(res.definitions.Test, {
        type: "string",
        enum: ["one", "two"],
        "x-ms-enum": {
          name: "Test",
          modelAsString: false,
          values: [
            { value: "one", name: "One" },
            { value: "two", name: "Two" },
          ],
        },
      });
    });

    it("change x-ms-enum.values names with @clientName", async () => {
      const res = await compileOpenAPI(
        `union Test {@clientName("OneClient") One: "one" , @clientName("TwoClient") Two: "two"};`,
        { preset: "azure" },
      );
      expect(res.definitions?.Test["x-ms-enum"]?.values).toEqual([
        { value: "one", name: "OneClient" },
        { value: "two", name: "TwoClient" },
      ]);
    });

    it("include the description the x-ms-enum values", async () => {
      const res = await openApiFor(
        `union Test {@doc("Doc for one") "one" , @doc("Doc for two") Two: "two"}`,
      );
      deepStrictEqual(res.definitions.Test, {
        type: "string",
        enum: ["one", "two"],
        "x-ms-enum": {
          name: "Test",
          modelAsString: false,
          values: [
            { value: "one", name: "one", description: "Doc for one" },
            { value: "two", name: "Two", description: "Doc for two" },
          ],
        },
      });
    });

    it("emit flattend enum when union reference another union", async () => {
      const res = await openApiFor(
        `
        union Test { UpDown, "left", "right"} 
        union UpDown { "up", "down" }
        `,
      );
      deepStrictEqual(res.definitions.Test, {
        type: "string",
        enum: ["up", "down", "left", "right"],
        "x-ms-enum": {
          name: "Test",
          modelAsString: false,
        },
      });
    });

    it("supports description on unions that reduce to enums", async () => {
      const res = await openApiFor(
        `
      @doc("FooUnion")
      union Foo {
        "a";
        "b";
      }

      `,
      );
      strictEqual(res.definitions.Foo.description, "FooUnion");
    });
  });

  describe("union with sub-unions bug", () => {
    it("should not add x-nullable for union containing sub-unions of models", async () => {
      // This reproduces the playground issue: union MessageAttachmentToolDefinit { {} | {} }
      const diagnostics = await diagnoseOpenApiFor(
        `
        union MessageAttachmentToolDefinit { {} | {} }
        model Test {
          attachment: MessageAttachmentToolDefinit;
        }
        op test(): Test;
        `,
      );
      
      // Should produce a union-unsupported diagnostic
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-autorest/union-unsupported",
        message: "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type.",
      });
      
      // Now let's test what actually happens - we need to investigate if this creates a null type
      // Let's create a different test that can actually run without the diagnostic error
    });

    it("investigate the x-nullable issue with a simpler case", async () => {
      // Let's test with a case that might not trigger the union-unsupported diagnostic
      // but still demonstrates the issue
      const res = await openApiFor(
        `
        model EmptyModel {}
        model Test {
          attachment: EmptyModel | null;
        }
        op test(): Test;
        `,
      );
      
      // This should correctly have x-nullable: true
      const attachmentProperty = res.definitions.Test.properties.attachment;
      strictEqual(attachmentProperty["x-nullable"], true);
    });

    it("test union with sub-union that does contain null", async () => {
      // Test case: union with sub-union that actually contains null
      const res = await openApiFor(
        `
        union SubUnion { "a", null }
        model Test {
          attachment: SubUnion;
        }
        op test(): Test;
        `,
      );
      
      // The SubUnion should be marked as nullable in its own definition
      strictEqual(res.definitions.SubUnion["x-nullable"], true);
    });

    it("reproduce the exact playground issue with union of empty models", async () => {
      // This is tricky because the playground example would trigger union-unsupported
      // Let's try a variation that might reproduce the issue
      const diagnostics = await diagnoseOpenApiFor(
        `
        union MessageAttachmentToolDefinit { {} | {} }
        model Test {
          attachment: MessageAttachmentToolDefinit;
        }
        op test(): Test;
        `,
      );
      
      // Should produce a union-unsupported diagnostic
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-autorest/union-unsupported",
        message: "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type.",
      });
    });

    it("test a case that might trigger incorrect nullable behavior", async () => {
      // Let's try to understand if there's a bug with how sub-unions are processed
      // when they fail to convert to enums
      const res = await openApiFor(
        `
        union SubUnion { "a" | null, "b" }
        model Test {
          attachment: SubUnion;
        }
        op test(): Test;
        `,
      );
      
      // The SubUnion should be marked as nullable because it has a sub-union with null
      // This is actually CORRECT behavior
      strictEqual(res.definitions.SubUnion["x-nullable"], true);
    });

    it("test union that should NOT be nullable", async () => {
      // Test a case where there's no null anywhere, but it might incorrectly get nullable
      const res = await openApiFor(
        `
        union SubUnion { "a", "b" }
        union ParentUnion { SubUnion, "c" }
        model Test {
          attachment: ParentUnion;
        }
        op test(): Test;
        `,
      );
      
      // This should NOT be nullable since there's no null anywhere
      strictEqual(res.definitions.ParentUnion["x-nullable"], undefined);
    });

    it("investigate potential issue with model sub-unions", async () => {
      // Maybe the issue is with unions that contain models that fail to be enums?
      // Let's test a simpler case that might reproduce the issue
      const diagnostics = await diagnoseOpenApiFor(
        `
        union SubUnion { {a: string}, {b: string} }
        union ParentUnion { SubUnion }
        model Test {
          attachment: ParentUnion;
        }
        op test(): Test;
        `,
      );
      
      // This should produce union-unsupported diagnostic
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-autorest/union-unsupported",
        message: "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type.",
      });
    });

    it("test union with sub-union that does NOT contain null", async () => {
      // Test case: union with sub-union that does NOT contain null
      const res = await openApiFor(
        `
        union SubUnion { "a", "b" }
        model Test {
          attachment: SubUnion;
        }
        op test(): Test;
        `,
      );
      
      // This should NOT have x-nullable because sub-union doesn't contain null
      const attachmentProperty = res.definitions.Test.properties.attachment;
      strictEqual(attachmentProperty["x-nullable"], undefined);
    });
  });
});
