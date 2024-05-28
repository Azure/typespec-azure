import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { diagnoseOpenApiFor, oapiForModel, openApiFor } from "./test-host.js";

describe("typespec-autorest: model definitions", () => {
  it("defines models", async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        x: int32;
      };`
    );

    ok(res.isRef);
    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: {
        x: { type: "integer", format: "int32" },
      },
      required: ["x"],
    });
  });

  it(`@projectedName("json", <>) updates the property name and set "x-ms-client-name" with the original name  - (LEGACY)`, async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        #suppress "deprecated" "for testing"
        @projectedName("json", "xJson")
        x: int32;
      };`
    );

    expect(res.defs.Foo).toMatchObject({
      properties: {
        xJson: { type: "integer", format: "int32", "x-ms-client-name": "x" },
      },
    });
  });

  it(`@projectedName("client", <>) set the "x-ms-client-name" with the original name (recommended to use @projectedName("json", <>) instead) - (LEGACY)`, async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        #suppress "deprecated" "for testing"
        @projectedName("client", "x")
        xJson: int32;
      };`
    );

    expect(res.defs.Foo).toMatchObject({
      properties: {
        xJson: { type: "integer", format: "int32", "x-ms-client-name": "x" },
      },
    });
  });

  it(`@clientName(<>) set the "x-ms-client-name" with the original name`, async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        @clientName("x")
        xJson: int32;
      };`
    );

    expect(res.defs.Foo).toMatchObject({
      properties: {
        xJson: { type: "integer", format: "int32", "x-ms-client-name": "x" },
      },
    });
  });

  it(`@clientName(<>) wins over @projectedName("client", <>)`, async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        #suppress "deprecated" "for testing"
        @clientName("x")
        @projectedName("client", "y")
        xJson: int32;
      };`
    );

    expect(res.defs.Foo).toMatchObject({
      properties: {
        xJson: { type: "integer", format: "int32", "x-ms-client-name": "x" },
      },
    });
  });

  it("using @summary sets the title on definitions and properties", async () => {
    const res = await oapiForModel(
      "Foo",
      `
      @summary("FooModel")
      model Foo {
        @summary("YProp")
        y: int32;
      };
      `
    );
    strictEqual(res.defs.Foo.title, "FooModel");
    strictEqual(res.defs.Foo.properties.y.title, "YProp");
  });

  it("uses json name specified via @encodedName", async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        @encodedName("application/json", "xJson")
        x: int32;
      };`
    );

    expect(res.defs.Foo).toMatchObject({
      properties: {
        xJson: { type: "integer", format: "int32", "x-ms-client-name": "x" },
      },
    });
  });

  it("uses json name specified via @encodedName even if @projectedName is provided", async () => {
    const res = await oapiForModel(
      "Foo",
      `model Foo {
        #suppress "deprecated" "for testing"
        @encodedName("application/json", "xJson")
        @projectedName("json", "projectedJson")
        x: int32;
      };`
    );

    expect(res.defs.Foo).toMatchObject({
      properties: {
        xJson: { type: "integer", format: "int32", "x-ms-client-name": "x" },
      },
    });
  });

  it("errors on duplicate model names", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      model P {
        p: string;
      }

      @friendlyName("P")
      model Q {
        q: string;
      }

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
      @route("/test1")
      @get
      op test1(p: P): Q;
      `
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@typespec/openapi/duplicate-type-name",
        message: /type/,
      },
    ]);
  });

  it("doesn't define anonymous or unconnected models", async () => {
    const res = await oapiForModel(
      "{ ... Foo }",
      `model Foo {
        x: int32;
      };`
    );

    ok(res.isRef);
    strictEqual(Object.keys(res.defs).length, 1);
    deepStrictEqual(res.useSchema, {
      $ref: "#/definitions/Foo",
    });
  });

  it("defines templated models", async () => {
    const res = await oapiForModel(
      "Foo<int32>",
      `model Foo<T> {
        x: T;
      };`
    );

    ok(!res.isRef);
    deepStrictEqual(res.useSchema, {
      type: "object",
      properties: {
        x: { type: "integer", format: "int32" },
      },
      required: ["x"],
    });
  });

  it("defines templated models when template param is in a namespace", async () => {
    const res = await oapiForModel(
      "Foo<Test.M>",
      `
      namespace Test {
        model M {}
      }
      model Foo<T> {
        x: T;
      };`
    );

    ok(!res.isRef);
    deepStrictEqual(res.useSchema, {
      type: "object",
      properties: {
        x: { $ref: "#/definitions/Test.M" },
      },
      required: ["x"],
    });
  });

  it("defines models extended from models", async () => {
    const res = await oapiForModel(
      "Bar",
      `
      model Foo {
        y: int32;
      };
      model Bar extends Foo {}`
    );

    ok(res.isRef);
    ok(res.defs.Foo, "expected definition named Foo");
    ok(res.defs.Bar, "expected definition named Bar");
    deepStrictEqual(res.defs.Bar, {
      type: "object",
      allOf: [{ $ref: "#/definitions/Foo" }],
    });

    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: { y: { type: "integer", format: "int32" } },
      required: ["y"],
    });
  });

  it("specify default value on nullable property", async () => {
    const res = await oapiForModel(
      "Foo",
      `
      model Foo {
        optional?: string | null = null;
      };
      `
    );

    ok(res.defs.Foo, "expected definition named Foo");
    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: {
        optional: {
          type: "string",
          "x-nullable": true,
          default: null,
        },
      },
    });
  });

  it("emits models extended from models when parent is emitted", async () => {
    const res = await openApiFor(
      `
      model Parent {
        x?: int32;
      };
      model Child extends Parent {
        y?: int32;
      }
      @route("/") op test(): Parent;
      `
    );
    deepStrictEqual(res.definitions.Parent, {
      type: "object",
      properties: { x: { type: "integer", format: "int32" } },
    });
    deepStrictEqual(res.definitions.Child, {
      type: "object",
      allOf: [{ $ref: "#/definitions/Parent" }],
      properties: { y: { type: "integer", format: "int32" } },
    });
  });

  it("specify default value on enum property inline the enum", async () => {
    const res = await oapiForModel(
      "Foo",
      `
      model Foo {
        optionalEnum?: MyEnum = MyEnum.a;
      };
      
      enum MyEnum {
        a: "a-value",
        b,
      }
      `
    );
    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: {
        optionalEnum: {
          type: "string",
          enum: ["a-value", "b"],
          "x-ms-enum": {
            name: "MyEnum",
            modelAsString: false,
            values: [
              { name: "a", value: "a-value" },
              { name: "b", value: "b" },
            ],
          },
          default: "a-value",
        },
      },
    });
  });

  it("specify default value on union with variant", async () => {
    const res = await oapiForModel(
      "Foo",
      `
      model Foo {
        optionalUnion?: MyUnion = MyUnion.a;
      };
      
      union MyUnion {
        a: "a-value",
        b: "b-value",
      }
      `
    );

    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: {
        optionalUnion: {
          type: "string",
          enum: ["a-value", "b-value"],
          "x-ms-enum": {
            values: [
              { name: "a", value: "a-value" },
              { name: "b", value: "b-value" },
            ],
            modelAsString: false,
            name: "MyUnion",
          },
          default: "a-value",
        },
      },
    });
  });

  it("errors on empty enum", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      model Foo {
        optionalEnum?: MyEnum;
      };
      
      enum MyEnum {}

      @route("/")
      op foo(): Foo;
      `
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-autorest/union-unsupported",
        message:
          "Empty unions are not supported for OpenAPI v2 - enums must have at least one value.",
        severity: "warning",
      },
    ]);
  });

  it("ignore uninstantiated template types", async () => {
    const res = await openApiFor(
      `
      model Parent {
        x?: int32;
      };
      @friendlyName("TParent_{name}", T)
      model TParent<T> extends Parent {
        t: T;
      }
      model Child extends TParent<string> {
        y?: int32;
      }
      @route("/") op test(): Parent;
      `
    );
    ok(!("TParent" in res.definitions), "Parent templated type shouldn't be included in OpenAPI");
    deepStrictEqual(res.definitions.Parent, {
      type: "object",
      properties: { x: { type: "integer", format: "int32" } },
    });
    deepStrictEqual(res.definitions.TParent_string, {
      type: "object",
      properties: { t: { type: "string" } },
      required: ["t"],
      allOf: [{ $ref: "#/definitions/Parent" }],
    });
    deepStrictEqual(res.definitions.Child, {
      type: "object",
      allOf: [{ $ref: "#/definitions/TParent_string" }],
      properties: { y: { type: "integer", format: "int32" } },
    });
  });

  it("shouldn't emit instantiated template child types that are only used in is", async () => {
    const res = await openApiFor(
      `
      model Parent {
        x?: int32;
      };
      model TParent<T> extends Parent {
        t: T;
      }
      model Child is TParent<string> {
        y?: int32;
      }
      @route("/") op test(): Parent;
      `
    );
    ok(
      !("TParent_string" in res.definitions),
      "Parent instantiated templated type shouldn't be included in OpenAPI"
    );
  });

  it("defines models with properties extended from models", async () => {
    const res = await oapiForModel(
      "Bar",
      `
      model Foo {
        y: int32;
      };
      model Bar extends Foo {
        x: int32;
      }`
    );

    ok(res.isRef);
    ok(res.defs.Foo, "expected definition named Foo");
    ok(res.defs.Bar, "expected definition named Bar");
    deepStrictEqual(res.defs.Bar, {
      type: "object",
      properties: { x: { type: "integer", format: "int32" } },
      allOf: [{ $ref: "#/definitions/Foo" }],
      required: ["x"],
    });

    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: { y: { type: "integer", format: "int32" } },
      required: ["y"],
    });
  });

  it("defines models extended from templated models", async () => {
    const res = await oapiForModel(
      "Bar",
      `
      model Foo<T> {
        y: T;
      };
      model Bar extends Foo<int32> {}`
    );

    ok(res.isRef);
    ok(res.defs["Foo_int32"] === undefined, "no definition named Foo_int32");
    ok(res.defs.Bar, "expected definition named Bar");
    deepStrictEqual(res.defs.Bar, {
      type: "object",
      properties: { y: { type: "integer", format: "int32" } },
      required: ["y"],
    });
  });

  it("defines models with properties extended from templated models", async () => {
    const res = await oapiForModel(
      "Bar",
      `
      model Foo<T> {
        y: T;
      };
      model Bar extends Foo<int32> {
        x: int32
      }`
    );

    ok(res.isRef);
    ok(res.defs.Bar, "expected definition named Bar");
    deepStrictEqual(res.defs.Bar, {
      type: "object",
      properties: { x: { type: "integer", format: "int32" } },
      required: ["x"],
      allOf: [
        {
          type: "object",
          properties: { y: { type: "integer", format: "int32" } },
          required: ["y"],
        },
      ],
    });
  });

  it("defines templated models with properties extended from templated models", async () => {
    const res = await oapiForModel(
      "Bar<int32>",
      `
      @friendlyName("Foo_{name}", T)
      model Foo<T> {
        y: T;
      };
      @friendlyName("Bar_{name}", T)
      model Bar<T> extends Foo<T> {
        x: T
      }`
    );

    ok(res.isRef);
    ok(res.defs.Foo_int32, "expected definition named Foo_int32");
    ok(res.defs.Bar_int32, "expected definition named Bar_int32");
    deepStrictEqual(res.defs.Bar_int32, {
      type: "object",
      properties: { x: { type: "integer", format: "int32" } },
      allOf: [{ $ref: "#/definitions/Foo_int32" }],
      required: ["x"],
    });

    deepStrictEqual(res.defs.Foo_int32, {
      type: "object",
      properties: { y: { type: "integer", format: "int32" } },
      required: ["y"],
    });
  });

  it("excludes response models with only headers", async () => {
    const res = await oapiForModel(
      "Foo",
      `
      model Foo { @statusCode code: 200, @header x: string};`
    );

    ok(!res.isRef);
    deepStrictEqual(res.defs, {});
    deepStrictEqual(res.response, {
      description: "The request has succeeded.",
      headers: { x: { type: "string" } },
    });
  });

  it("defines models with no properties extended", async () => {
    const res = await oapiForModel(
      "Bar",
      `
      model Foo { x?: string};
      model Bar extends Foo {};`
    );

    ok(res.isRef);
    ok(res.defs.Foo, "expected definition named Foo");
    ok(res.defs.Bar, "expected definition named Bar");
    deepStrictEqual(res.defs.Bar, {
      type: "object",
      allOf: [{ $ref: "#/definitions/Foo" }],
    });

    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: { x: { type: "string" } },
    });
  });

  it("defines models with no properties extended twice", async () => {
    const res = await oapiForModel(
      "Baz",
      `
      model Foo { x: int32 };
      model Bar extends Foo {};
      model Baz extends Bar {};`
    );

    ok(res.isRef);
    ok(res.defs.Foo, "expected definition named Foo");
    ok(res.defs.Bar, "expected definition named Bar");
    ok(res.defs.Baz, "expected definition named Baz");
    deepStrictEqual(res.defs.Baz, {
      type: "object",
      allOf: [{ $ref: "#/definitions/Bar" }],
    });

    deepStrictEqual(res.defs.Bar, {
      type: "object",
      allOf: [{ $ref: "#/definitions/Foo" }],
    });

    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: {
        x: {
          format: "int32",
          type: "integer",
        },
      },
      required: ["x"],
    });
  });

  it("defines models with default properties", async () => {
    const res = await oapiForModel(
      "Pet",
      `
      model Pet {
        someString?: string = "withDefault"
      }
      `
    );

    ok(res.isRef);
    ok(res.defs.Pet, "expected definition named Pet");
    deepStrictEqual(res.defs.Pet.properties.someString.default, "withDefault");
  });

  describe("nullable", () => {
    it("defines nullable properties", async () => {
      const res = await oapiForModel(
        "Pet",
        `
      model Pet {
        name: string | null;
      };
      `
      );
      ok(res.isRef);
      deepStrictEqual(res.defs.Pet, {
        type: "object",
        properties: {
          name: {
            type: "string",
            "x-nullable": true,
          },
        },
        required: ["name"],
      });
    });

    it("defines nullable array", async () => {
      const res = await oapiForModel(
        "Pet",
        `
      model Pet {
        name: int32[] | null;
      };
      `
      );
      ok(res.isRef);
      deepStrictEqual(res.defs.Pet, {
        type: "object",
        properties: {
          name: {
            type: "array",
            items: {
              type: "integer",
              format: "int32",
            },
            "x-nullable": true,
          },
        },
        required: ["name"],
      });
    });

    it("defines nullable enum", async () => {
      const res = await oapiForModel(
        "Pet",
        `
      enum PetKind { dog, cat }
      model Pet {
        kind: PetKind | null;
      };
      `
      );
      ok(res.isRef);
      deepStrictEqual(res.defs.Pet, {
        type: "object",
        properties: {
          kind: {
            $ref: "#/definitions/PetKind",
            "x-nullable": true,
          },
        },
        required: ["kind"],
      });
      deepStrictEqual(res.defs.PetKind, {
        type: "string",
        enum: ["dog", "cat"],
        "x-ms-enum": {
          modelAsString: false,
          name: "PetKind",
        },
      });
    });

    it("defines nullable union", async () => {
      const res = await oapiForModel(
        "Pet",
        `
      union PetKind { "dog", "cat" }
      model Pet {
        kind: PetKind | null;
      };
      `
      );
      ok(res.isRef);
      deepStrictEqual(res.defs.Pet, {
        type: "object",
        properties: {
          kind: {
            $ref: "#/definitions/PetKind",
            "x-nullable": true,
          },
        },
        required: ["kind"],
      });
      deepStrictEqual(res.defs.PetKind, {
        type: "string",
        enum: ["dog", "cat"],
        "x-ms-enum": {
          modelAsString: false,
          name: "PetKind",
        },
      });
    });
  });

  it("recovers logical type name", async () => {
    const oapi = await openApiFor(
      `
      model Thing {
        name?: string;
      }

      @route("/things/{id}")
      @get
      op get(@path id: string, @query test: string, ...Thing): Thing & { @header test: string; };
      `
    );

    deepStrictEqual(oapi.definitions.Thing, {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
      },
    });

    deepStrictEqual(
      oapi.paths["/things/{id}"].get.parameters.find((p: any) => p.in === "body").schema,
      {
        $ref: "#/definitions/Thing",
      }
    );

    deepStrictEqual(oapi.paths["/things/{id}"].get.responses["200"].schema, {
      $ref: "#/definitions/Thing",
    });
  });

  it("detects cycles in inline type", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      model Thing<T> { inner?: Thing<T>; }

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
      op get(): Thing<string>;
      `,
      { "omit-unreachable-types": true }
    );

    expectDiagnostics(diagnostics, [{ code: "@azure-tools/typespec-autorest/inline-cycle" }]);
  });

  it("excludes properties with type 'never'", async () => {
    const res = await oapiForModel(
      "Bar",
      `
      model Foo {
        y: int32;
        nope: never;
      };
      model Bar extends Foo {
        x: int32;
      }`
    );

    ok(res.isRef);
    ok(res.defs.Foo, "expected definition named Foo");
    ok(res.defs.Bar, "expected definition named Bar");
    deepStrictEqual(res.defs.Bar, {
      type: "object",
      properties: { x: { type: "integer", format: "int32" } },
      allOf: [{ $ref: "#/definitions/Foo" }],
      required: ["x"],
    });

    deepStrictEqual(res.defs.Foo, {
      type: "object",
      properties: { y: { type: "integer", format: "int32" } },
      required: ["y"],
    });
  });

  describe("referencing another property as type", () => {
    it("use the type of the other property", async () => {
      const res = await oapiForModel(
        "Bar",
        `
        model Foo {
          name: string;
        }
        model Bar {
          x: Foo.name
        }`
      );

      ok(res.defs.Bar, "expected definition named Bar");
      deepStrictEqual(res.defs.Bar.properties.x, {
        type: "string",
      });
    });

    it("use the type of the other property with ref", async () => {
      const res = await oapiForModel(
        "Bar",
        `
        model Name {first: string}
        model Foo {
          name: Name;
        }
        model Bar {
          x: Foo.name
        }`
      );

      ok(res.defs.Bar, "expected definition named Bar");
      deepStrictEqual(res.defs.Bar.properties.x, {
        $ref: "#/definitions/Name",
      });
    });

    it("should include decorators on both referenced property and source property itself", async () => {
      const res = await oapiForModel(
        "Bar",
        `
        model Foo {
          @format("uri")
          name: string;
        }
        model Bar {
          @doc("My doc")
          x: Foo.name
        }`
      );

      ok(res.defs.Bar, "expected definition named Bar");
      deepStrictEqual(res.defs.Bar.properties.x, {
        type: "string",
        format: "uri",
        description: "My doc",
      });
    });

    it("decorators on the property should override the value of referenced property", async () => {
      const res = await oapiForModel(
        "Bar",
        `
        model Foo {
          @doc("Default doc")
          name: string;
        }
        model Bar {
          @doc("My doc override")
          x: Foo.name
        }`
      );

      ok(res.defs.Bar, "expected definition named Bar");
      deepStrictEqual(res.defs.Bar.properties.x, {
        type: "string",
        description: "My doc override",
      });
    });
  });
});
