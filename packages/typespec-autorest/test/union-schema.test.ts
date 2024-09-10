import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { diagnoseOpenApiFor, openApiFor } from "./test-host.js";

describe("typespec-autorest: union schema", () => {
  it("union with self reference model and null", async () => {
    const res = await openApiFor(
      `
      model Thing {
        id: string;
        properties: Thing | null;
      }
      op doStuff(): Thing;
      `
    );
    deepStrictEqual(res.definitions.Thing.properties.properties, {
      type: "object",
      allOf: [{ $ref: "#/definitions/Thing" }],
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
      `
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/union-unsupported",
      message:
        "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type.",
    });
  });

  describe("unions as enum", () => {
    it("change definition name with @clientName", async () => {
      const res = await openApiFor(`@clientName("ClientFoo") union Foo {"a"};`);
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
      const res = await openApiFor(
        `union Test {@clientName("OneClient") One: "one" , @clientName("TwoClient") Two: "two"};`
      );
      expect(res.definitions.Test["x-ms-enum"].values).toEqual([
        { value: "one", name: "OneClient" },
        { value: "two", name: "TwoClient" },
      ]);
    });

    it("include the description the x-ms-enum values", async () => {
      const res = await openApiFor(
        `union Test {@doc("Doc for one") "one" , @doc("Doc for two") Two: "two"}`
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
        `
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

      `
      );
      strictEqual(res.definitions.Foo.description, "FooUnion");
    });
  });
});
