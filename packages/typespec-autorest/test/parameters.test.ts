import { expectDiagnostics, extractSquiggles } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import {
  OpenAPI2HeaderParameter,
  OpenAPI2PathParameter,
  OpenAPI2QueryParameter,
} from "../src/openapi2-document.js";
import {
  compileOpenAPI,
  diagnoseOpenApiFor,
  ignoreUseStandardOps,
  openApiFor,
  Tester,
} from "./test-host.js";

describe("path parameters", () => {
  async function getPathParam(code: string, name = "myParam"): Promise<OpenAPI2PathParameter> {
    const res = await compileOpenAPI(code, { preset: "azure" });
    return res.paths[`/{${name}}`].get?.parameters[0] as any;
  }

  it("figure out the route parameter from the name of the param", async () => {
    const res = await openApiFor(`op test(@path myParam: string): void;`);
    expect(res.paths).toHaveProperty("/{myParam}");
  });

  it("uses explicit name provided from @path", async () => {
    const res = await openApiFor(`op test(@path("my-custom-path") myParam: string): void;`);
    expect(res.paths).toHaveProperty("/{my-custom-path}");
  });

  it("set x-ms-client-name with @clientName", async () => {
    const param = await getPathParam(
      `op test(@clientName("myParamClient") @path myParam: string): void;`,
    );
    expect(param).toMatchObject({
      name: "myParam",
      "x-ms-client-name": "myParamClient",
    });
  });

  describe("setting reserved expansion attribute applies the x-ms-skip-url-encoding property", () => {
    it("with option", async () => {
      const param = await getPathParam(
        `op test(@path(#{allowReserved: true}) myParam: string[]): void;`,
      );
      expect(param).toMatchObject({
        "x-ms-skip-url-encoding": true,
      });
    });
    it("with uri template", async () => {
      const param = await getPathParam(`@route("{+myParam}") op test(myParam: string[]): void;`);
      expect(param).toMatchObject({
        "x-ms-skip-url-encoding": true,
      });
    });
  });

  it("report unsupported-param-type diagnostic on the parameter when using unsupported types", async () => {
    const { /*pos, end,*/ source } = extractSquiggles(
      `op test(~~~@path myParam: Record<string>~~~): void;`,
    );
    const diagnostics = await Tester.diagnose(source);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/unsupported-param-type",
      message:
        "Parameter can only be represented as primitive types in swagger 2.0. Information is lost for part 'myParam'.",
      // TODO: find equivalent for this
      // pos: pos + runner.autoCodeOffset,
      // end: end + runner.autoCodeOffset,
    });
  });
});

describe("query parameters", () => {
  async function getQueryParam(code: string): Promise<OpenAPI2QueryParameter> {
    const res = await compileOpenAPI(code, { preset: "azure" });
    const param: any = res.paths[`/`].get?.parameters[0];
    strictEqual(param.in, "query");
    return param;
  }

  it("create a query param", async () => {
    const param = await getQueryParam(`op test(@query arg1: string): void;`);
    deepStrictEqual(param, {
      in: "query",
      name: "arg1",
      required: true,
      type: "string",
    });
  });

  it("create a query param with different name", async () => {
    const param = await getQueryParam(`op test(@query("$select") select: string): void;`);
    deepStrictEqual(param, {
      in: "query",
      name: "$select",
      "x-ms-client-name": "select",
      required: true,
      type: "string",
    });
  });

  it("set x-ms-client-name with @clientName", async () => {
    const param = await getQueryParam(
      `op test(@clientName("myParamClient") @query myParam: string): void;`,
    );
    expect(param).toMatchObject({
      name: "myParam",
      "x-ms-client-name": "myParamClient",
    });
  });

  describe("setting parameter explode modifier set collectionFormat to multi", () => {
    it("with option", async () => {
      const param = await getQueryParam(
        `op test(@query(#{explode: true}) myParam: string[]): void;`,
      );
      expect(param).toMatchObject({
        collectionFormat: "multi",
      });
    });

    it("with uri template", async () => {
      const param = await getQueryParam(`@route("{?myParam*}") op test(myParam: string[]): void;`);
      expect(param).toMatchObject({
        collectionFormat: "multi",
      });
    });
  });

  describe("setting parameter collectionFormat", () => {
    it("with option", async () => {
      const param = await getQueryParam(`op test(@query myParam: string[]): void;`);
      expect(param).toMatchObject({
        collectionFormat: "csv",
      });
    });

    it("pipeDelimited", async () => {
      const param = await getQueryParam(
        `op test(@query @encode(ArrayEncoding.pipeDelimited) myParam: string[]): void;`,
      );
      expect(param).toMatchObject({
        collectionFormat: "pipes",
      });
    });

    it("spaceDelimited", async () => {
      const param = await getQueryParam(
        `op test(@query @encode(ArrayEncoding.spaceDelimited) myParam: string[]): void;`,
      );
      expect(param).toMatchObject({
        collectionFormat: "ssv",
      });
    });

    it("wrong encode", async () => {
      const diagnostics = await diagnoseOpenApiFor(
        `op test(@query @encode("tsv") myParam: string[]): void;`,
      );
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-autorest/invalid-multi-collection-format",
      });
    });
  });

  it("create a query param that is a model property", async () => {
    const res = await openApiFor(
      `
      op test(@query id: UserContext.id): void;
      
      model UserContext {
        id: string;
      }
      `,
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
      `,
    );
    strictEqual(res.paths["/"].get.parameters[0].description, "my-doc");
  });

  it("description on param override type description", async () => {
    const res = await openApiFor(
      `
      @doc("This is a shared scalar")
      scalar myString extends string; 
      op test(@query @doc("my-doc") arg1: myString): void;
      `,
    );
    strictEqual(res.paths["/"].get.parameters[0].description, "my-doc");
  });
});

describe("header parameters", () => {
  it("create a header param of array", async () => {
    const res = await openApiFor(
      `
      op test(@header arg1: string[]): void;
      `,
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
      { "omit-unreachable-types": true },
    );

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
      `,
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
      `,
    );

    strictEqual(oapi.parameters["PetId"]["x-ms-parameter-location"], "client");
  });

  it("inline spread of parameters from anonymous model", async () => {
    const oapi = await openApiFor(
      `
      op template<TParameters, TReturn>(...TParameters): TReturn;
      op instantiation is template<{@path id: string}, void>;
      `,
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
      `,
    );
    strictEqual(res.paths["/"].get.parameters.length, 1);
    strictEqual(res.paths["/"].get.parameters[0].in, "query");
    strictEqual(res.paths["/"].get.parameters[0].name, "top");
  });

  it("set x-ms-client-name with @clientName", async () => {
    const res = await compileOpenAPI(
      `op test(@clientName("myParamClient") @header myParam: string): void;`,
      { preset: "azure" },
    );
    expect(res.paths["/"].get?.parameters[0]).toMatchObject({
      name: "my-param",
      "x-ms-client-name": "myParamClient",
    });
  });

  describe("setting parameter collectionFormat", () => {
    async function getHeaderParam(code: string): Promise<OpenAPI2QueryParameter> {
      const res = await openApiFor(code);
      const param = res.paths[`/`].get.parameters[0];
      strictEqual(param.in, "header");
      return param;
    }

    it("with option", async () => {
      const param = await getHeaderParam(`op test(@header myParam: string[]): void;`);
      expect(param).toMatchObject({
        collectionFormat: "csv",
      });
    });

    it("pipeDelimited", async () => {
      const param = await getHeaderParam(
        `op test(@header @encode(ArrayEncoding.pipeDelimited) myParam: string[]): void;`,
      );
      expect(param).toMatchObject({
        collectionFormat: "pipes",
      });
    });

    it("spaceDelimited", async () => {
      const param = await getHeaderParam(
        `op test(@header @encode(ArrayEncoding.spaceDelimited) myParam: string[]): void;`,
      );
      expect(param).toMatchObject({
        collectionFormat: "ssv",
      });
    });

    it("wrong encode", async () => {
      const diagnostics = await diagnoseOpenApiFor(
        `op test(@header @encode("tsv") myParam: string[]): void;`,
      );
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-autorest/invalid-multi-collection-format",
      });
    });
  });
});

describe("body parameters", () => {
  it("omit request body if type is void", async () => {
    const res = await compileOpenAPI(`op test(@body foo: void): void;`, { preset: "azure" });
    deepStrictEqual(res.paths["/"].post?.parameters, []);
  });

  it("set name with @clientName", async () => {
    const res = await compileOpenAPI(`op test(@body @clientName("bar") foo: string): void;`, {
      preset: "azure",
    });
    expect(res.paths["/"].post?.parameters[0]).toMatchObject({ in: "body", name: "bar" });
  });

  it("set x-ms-client-name with @clientName when also using encodedName", async () => {
    const res = await compileOpenAPI(
      `
      #suppress "deprecated" "For testing"
      op test(@body @encodedName("application/json", "jsonName") @clientName("bar") foo: string): void;`,
      { preset: "azure" },
    );
    expect(res.paths["/"].post?.parameters[0]).toMatchObject({
      in: "body",
      name: "jsonName",
      "x-ms-client-name": "bar",
    });
  });

  it("using @body ignore any metadata property underneath", async () => {
    const res = await openApiFor(`@get op read(
      @body body: {
        #suppress "@typespec/http/metadata-ignored"
        @header header: string,
        #suppress "@typespec/http/metadata-ignored"
        @query query: string,
        #suppress "@typespec/http/metadata-ignored"
        @statusCode code: 201,
      }
    ): void;`);
    expect(res.paths["/"].get.parameters[0].schema).toEqual({
      type: "object",
      properties: {
        header: { type: "string" },
        query: { type: "string" },
        code: { type: "number", enum: [201] },
      },
      required: ["header", "query", "code"],
    });
  });

  describe("request parameters resolving to no property in the body produce no body", () => {
    it.each(["()", "(@header prop: string)", `(@invisible(Lifecycle) prop: string)`])(
      "%s",
      async (params) => {
        const res = await openApiFor(`op test${params}: void;`);
        strictEqual(res.paths["/"].get.requestBody, undefined);
      },
    );
  });

  it("property in body with only metadata properties should still be included", async () => {
    const res = await openApiFor(`op read(
        headers: {
          @header header1: string;
          @header header2: string;
        };
        name: string;
      ): void;`);
    expect(res.paths["/"].post.parameters[2].schema).toEqual({
      type: "object",
      properties: {
        headers: { type: "object" },
        name: { type: "string" },
      },
      required: ["headers", "name"],
    });
  });

  it("property in body with only metadata properties and @bodyIgnore should not be included", async () => {
    const res = await openApiFor(`op read(
        @bodyIgnore headers: {
          @header header1: string;
          @header header2: string;
        };
        name: string;
    ): void;`);
    expect(res.paths["/"].post.parameters[2].schema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    });
  });
});

describe("content type parameter", () => {
  it("header named with 'Content-Type' gets resolved as content type for operation.", async () => {
    const res = await openApiFor(
      `
      op test(
        @header("Content-Type") explicitContentType: "application/octet-stream",
        @body foo: string
      ): void;
      `,
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
      `,
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
      `,
    );
    deepStrictEqual(res.paths["/"].post.consumes, ["text/plain"]);
  });
});

describe("misc", () => {
  describe("type can only be primitive items without $ref", () => {
    async function testParameter(
      decorator: string,
      type: string,
    ): Promise<OpenAPI2HeaderParameter | OpenAPI2QueryParameter> {
      const res = await openApiFor(
        `
        union NamedUnion {"one", "two"}
        enum Foo {one, two}
        op test(${decorator} arg1: ${type}): void;
        `,
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
            "x-ms-enum": { modelAsString: false, name: "Foo" },
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
