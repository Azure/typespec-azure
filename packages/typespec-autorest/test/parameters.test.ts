import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { OpenAPI2HeaderParameter, OpenAPI2QueryParameter } from "../src/types.js";
import { diagnoseOpenApiFor, ignoreUseStandardOps, openApiFor } from "./test-host.js";

describe("typespec-autorest: parameters", () => {
  it("create a query param", async () => {
    const res = await openApiFor(
      `
      op test(@query arg1: string): void;
      `
    );
    deepStrictEqual(res.paths["/"].get.parameters[0], {
      in: "query",
      name: "arg1",
      required: true,
      type: "string",
    });
  });

  it("create a query param of array type", async () => {
    const res = await openApiFor(
      `
      op test(@query({format: "multi"}) arg1: string[], @query({format: "csv"}) arg2: string[]): void;
      `
    );
    deepStrictEqual(res.paths["/"].get.parameters[0], {
      in: "query",
      name: "arg1",
      required: true,
      type: "array",
      items: { type: "string" },
      collectionFormat: "multi",
    });
    deepStrictEqual(res.paths["/"].get.parameters[1], {
      in: "query",
      name: "arg2",
      required: true,
      type: "array",
      items: { type: "string" },
      collectionFormat: "csv",
    });
  });

  it("create a header param of array type", async () => {
    const res = await openApiFor(
      `
      op test(@header({format: "csv"}) arg1: string[]): void;
      `
    );
    deepStrictEqual(res.paths["/"].get.parameters[0], {
      in: "header",
      name: "arg1",
      required: true,
      type: "array",
      items: { type: "string" },
      collectionFormat: "csv",
    });
  });

  it("create a query param that is a model property", async () => {
    const res = await openApiFor(
      `
      op test(@query id: UserContext.id): void;
      
      model UserContext {
        id: string;
      }
      `
    );
    deepStrictEqual(res.paths["/"].get.parameters[0], {
      in: "query",
      name: "id",
      required: true,
      type: "string",
    });
  });

  it("set description on param", async () => {
    const res = await openApiFor(
      `
      op test(@query @doc("my-doc") arg1: string): void;
      `
    );
    strictEqual(res.paths["/"].get.parameters[0].description, "my-doc");
  });

  it("description on param override type description", async () => {
    const res = await openApiFor(
      `
      @doc("This is a shared scalar")
      scalar myString extends string; 
      op test(@query @doc("my-doc") arg1: myString): void;
      `
    );
    strictEqual(res.paths["/"].get.parameters[0].description, "my-doc");
  });

  it("@query/@header/@path names & @projectedName on body parameter are honored", async () => {
    const res = await openApiFor(
      `
      @route("/{arg3}")
      op test(
        @query("x-ms-arg-1") @doc("my-doc") arg1: string,
        @header("x-ms-arg-2") @doc("my-doc") arg2: string,
        @path("x-ms-arg-3") @doc("my-doc") arg3: string): void;

      @put
      op test2(
        @projectedName("json", "x-body") @body @doc("my-doc") arg: string): void;

      `
    );
    strictEqual(res.paths["/{arg3}"].get.parameters[0].name, "x-ms-arg-1");
    strictEqual(res.paths["/{arg3}"].get.parameters[1].name, "x-ms-arg-2");
    strictEqual(res.paths["/{arg3}"].get.parameters[2].name, "x-ms-arg-3");
    strictEqual(res.paths["/"].put.parameters[0].name, "x-body");
  });

  it("errors on duplicate parameter keys", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      model P {
        @query id: string;
      }

      @friendlyName("P")
      model Q {
        @header id: string;
      }

      @route("/test1")
      op test1(...P): void;

      @route("/test2")
      op test2(...Q): void;
      `,
      { "omit-unreachable-types": true }
    );
    ``;

    expectDiagnostics(ignoreUseStandardOps(diagnostics), [
      {
        code: "@typespec/openapi/duplicate-type-name",
        message: /parameter/,
      },
    ]);
  });

  it("encodes parameter keys in references", async () => {
    const oapi = await openApiFor(
      `
      model Pet extends Pet$Id {
        
        name: string;
      }
      model Pet$Id {
        @path
        petId: string;
      }
      @route("/Pets")
      @get()
      op get(... Pet$Id): Pet;
      `
    );

    ok(oapi.paths["/Pets/{petId}"].get);
    strictEqual(oapi.paths["/Pets/{petId}"].get.parameters[0]["$ref"], "#/parameters/Pet%24Id");
    strictEqual(oapi.parameters["Pet$Id"].name, "petId");
  });

  it("can override x-ms-parameter-location for shared parameters", async () => {
    const oapi = await openApiFor(
      `
      model PetId {
        @query
        @extension("x-ms-parameter-location", "client")
        petId: string;
      }
      @get op get(...PetId): void;
      `
    );

    strictEqual(oapi.parameters["PetId"]["x-ms-parameter-location"], "client");
  });

  it("inline spread of parameters from anonymous model", async () => {
    const oapi = await openApiFor(
      `
      op template<TParameters, TReturn>(...TParameters): TReturn;
      op instantiation is template<{@path id: string}, void>;
      `
    );

    ok(oapi.paths["/{id}"].get);

    deepStrictEqual(oapi.paths["/{id}"].get.parameters, [
      {
        name: "id",
        in: "path",
        required: true,
        type: "string",
      },
    ]);
  });

  it("omit parameters with type never", async () => {
    const res = await openApiFor(
      `
      op test(@query select: never, @query top: int32): void;
      `
    );
    strictEqual(res.paths["/"].get.parameters.length, 1);
    strictEqual(res.paths["/"].get.parameters[0].in, "query");
    strictEqual(res.paths["/"].get.parameters[0].name, "top");
  });

  it("omit request body if type is void", async () => {
    const res = await openApiFor(`op test(@body foo: void): void;`);
    deepStrictEqual(res.paths["/"].post.parameters, []);
  });

  describe("content type parameter", () => {
    it("header named with 'Content-Type' gets resolved as content type for operation.", async () => {
      const res = await openApiFor(
        `
        op test(
          @header("Content-Type") explicitContentType: "application/octet-stream",
          @body foo: string
        ): void;
        `
      );
      deepStrictEqual(res.paths["/"].post.consumes, ["application/octet-stream"]);
    });

    it("header named contentType gets resolved as content type for operation.", async () => {
      const res = await openApiFor(
        `
        op test(
          @header contentType: "application/octet-stream",
          @body foo: string
        ): void;
        `
      );
      deepStrictEqual(res.paths["/"].post.consumes, ["application/octet-stream"]);
    });

    it("query named contentType doesn't get resolved as the content type parmaeter.", async () => {
      const res = await openApiFor(
        `
        op test(
          @query contentType: "application/octet-stream",
          @body foo: string
        ): void;
        `
      );
      strictEqual(res.paths["/"].post.consumes, undefined);
    });

    describe("type can only be primitive items without $ref", () => {
      async function testParameter(
        decorator: string,
        type: string
      ): Promise<OpenAPI2HeaderParameter | OpenAPI2QueryParameter> {
        const res = await openApiFor(
          `
          union NamedUnion {"one", "two"}
          enum Foo {one, two}
          op test(${decorator} arg1: ${type}): void;
          `
        );
        return res.paths["/"].get.parameters[0];
      }

      ["query", "header"].forEach((kind) => {
        describe(kind, () => {
          it("enum is kept inline", async () => {
            deepStrictEqual(await testParameter(`@${kind}`, "Foo"), {
              in: kind,
              name: "arg1",
              required: true,
              type: "string",
              enum: ["one", "two"],
              "x-ms-enum": { modelAsString: true, name: "Foo" },
            });
          });

          it("array of enum is kept inline", async () => {
            deepStrictEqual(await testParameter(`@${kind}({format: "multi"})`, "Foo[]"), {
              in: kind,
              name: "arg1",
              required: true,
              collectionFormat: "multi",
              type: "array",
              items: {
                type: "string",
                enum: ["one", "two"],
                "x-ms-enum": { modelAsString: true, name: "Foo" },
              },
            });
          });

          it("named union is kept inline", async () => {
            deepStrictEqual(await testParameter(`@${kind}`, "NamedUnion"), {
              in: kind,
              name: "arg1",
              required: true,
              type: "string",
              enum: ["one", "two"],
              "x-ms-enum": { modelAsString: false, name: "NamedUnion" },
            });
          });
        });
      });
    });
  });
});
