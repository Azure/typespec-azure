import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { OpenAPI2Parameter, OpenAPI2Schema } from "../src/types.js";
import { diagnoseOpenApiFor, oapiForModel, openApiFor } from "./test-host.js";

describe("handle typespec intrinsic types", () => {
  const cases = [
    ["unknown", {}],
    ["int8", { type: "integer", format: "int8" }],
    ["int16", { type: "integer", format: "int16" }],
    ["int32", { type: "integer", format: "int32" }],
    ["int64", { type: "integer", format: "int64" }],
    ["safeint", { type: "integer", format: "int64" }],
    ["uint8", { type: "integer", format: "uint8" }],
    ["uint16", { type: "integer", format: "uint16" }],
    ["uint32", { type: "integer", format: "uint32" }],
    ["uint64", { type: "integer", format: "uint64" }],
    ["float32", { type: "number", format: "float" }],
    ["float64", { type: "number", format: "double" }],
    ["string", { type: "string" }],
    ["boolean", { type: "boolean" }],
    ["plainDate", { type: "string", format: "date" }],
    ["utcDateTime", { type: "string", format: "date-time" }],
    ["offsetDateTime", { type: "string", format: "date-time" }],
    ["plainTime", { type: "string", format: "time" }],
    ["duration", { type: "string", format: "duration" }],
    ["bytes", { type: "string", format: "byte" }],
    ["decimal", { type: "number", format: "decimal" }],
    ["decimal128", { type: "number", format: "decimal" }],
  ];

  for (const test of cases) {
    it("knows schema for " + test[0], async () => {
      const res = await oapiForModel(
        "Pet",
        `
        model Pet { name: ${test[0]} };
        `
      );

      const schema = res.defs.Pet.properties.name;
      deepStrictEqual(schema, test[1]);
    });
  }
});

describe("handle nonspecific intrinsic types", () => {
  const cases = [
    [
      "numeric",
      "Scalar type 'numeric' is not specific enough. The more specific type 'int64' has been chosen.",
    ],
    [
      "integer",
      "Scalar type 'integer' is not specific enough. The more specific type 'int64' has been chosen.",
    ],
    [
      "float",
      "Scalar type 'float' is not specific enough. The more specific type 'float64' has been chosen.",
    ],
  ];

  for (const test of cases) {
    it("reports nonspecific scalar for " + test[0], async () => {
      const res = await diagnoseOpenApiFor(
        `
        @service({title: "Testing model"})
        @route("/")
        namespace root {
          #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
          op read(): void;

          model Pet { name: ${test[0]} };
        }
        `
      );

      expectDiagnostics(res, {
        code: "@azure-tools/typespec-autorest/nonspecific-scalar",
        message: test[1],
      });
    });
  }
});

it("defines models extended from primitives", async () => {
  const res = await oapiForModel(
    "Pet",
    `
    scalar shortString extends string;
    model Pet { name: shortString };
    `
  );

  ok(res.isRef);
  ok(res.defs.shortString, "expected definition named shortString");
  ok(res.defs.Pet, "expected definition named Pet");
  deepStrictEqual(res.defs.shortString, {
    type: "string",
  });
});

it("apply description on extended primitive (string)", async () => {
  const res = await oapiForModel(
    "shortString",
    `
    @doc("My custom description")
    scalar shortString extends string;
    `
  );

  ok(res.isRef);
  deepStrictEqual(res.defs.shortString, {
    type: "string",
    description: "My custom description",
  });
});

it("apply description on extended primitive (int32)", async () => {
  const res = await oapiForModel(
    "specialInt",
    `
    @doc("My custom description")
    scalar specialInt extends int32;
    `
  );

  ok(res.isRef);
  deepStrictEqual(res.defs.specialInt, {
    type: "integer",
    format: "int32",
    description: "My custom description",
  });
});

it("apply description on extended custom scalars", async () => {
  const res = await oapiForModel(
    "superSpecialint",
    `
  @doc("My custom description")
  scalar specialint extends int32;
  @doc("Override specialint description")
  scalar superSpecialint extends specialint;
  `
  );

  ok(res.isRef);
  deepStrictEqual(res.defs.superSpecialint, {
    type: "integer",
    format: "int32",
    description: "Override specialint description",
  });
});

it("defines scalar extended from primitives with attrs", async () => {
  const res = await oapiForModel(
    "Pet",
    `
    @maxLength(10) @minLength(10)
    scalar shortString extends string;
    model Pet { name: shortString };
    `
  );

  ok(res.isRef);
  ok(res.defs.shortString, "expected definition named shortString");
  ok(res.defs.Pet, "expected definition named Pet");
  deepStrictEqual(res.defs.shortString, {
    type: "string",
    minLength: 10,
    maxLength: 10,
  });
});

it("defines scalar extended from primitives with new attrs", async () => {
  const res = await oapiForModel(
    "Pet",
    `
    @maxLength(10)
    scalar shortString extends string;
    @minLength(1)
    scalar shortButNotEmptyString extends shortString;
    model Pet { name: shortButNotEmptyString, breed: shortString };
    `
  );
  ok(res.isRef);
  ok(res.defs.shortString, "expected definition named shortString");
  ok(res.defs.shortButNotEmptyString, "expected definition named shortButNotEmptyString");
  ok(res.defs.Pet, "expected definition named Pet");

  deepStrictEqual(res.defs.shortString, {
    type: "string",
    maxLength: 10,
  });
  deepStrictEqual(res.defs.shortButNotEmptyString, {
    type: "string",
    minLength: 1,
    maxLength: 10,
  });
});

it("includes extensions passed on the scalar", async () => {
  const res = await oapiForModel(
    "Pet",
    `
  @extension("x-custom", "my-value")
  scalar Pet extends string;
  `
  );

  ok(res.defs.Pet, "expected definition named Pet");
  deepStrictEqual(res.defs.Pet, {
    type: "string",
    "x-custom": "my-value",
  });
});

describe("using @encode decorator", () => {
  async function testEncode(
    scalar: string,
    expectedOpenApi: OpenAPI2Schema,
    encoding?: string,
    encodeAs?: string
  ) {
    const encodeAsParam = encodeAs ? `, ${encodeAs}` : "";
    const encodeDecorator = encoding ? `@encode("${encoding}"${encodeAsParam})` : "";
    const res1 = await oapiForModel("s", `${encodeDecorator} scalar s extends ${scalar};`);
    deepStrictEqual(res1.defs.s, expectedOpenApi);
    const res2 = await oapiForModel("Test", `model Test {${encodeDecorator} prop: ${scalar}};`);
    deepStrictEqual(res2.defs.Test.properties.prop, expectedOpenApi);
  }

  describe("utcDateTime", () => {
    it("set format to 'date-time' by default", () =>
      testEncode("utcDateTime", { type: "string", format: "date-time" }));
    it("set format to 'date-time-rfc7231' when encoding is rfc7231", () =>
      testEncode("utcDateTime", { type: "string", format: "date-time-rfc7231" }, "rfc7231"));
    it("set format to 'date-time-rfc7231' for a header when encoding is rfc7231", async () => {
      const oapi = await openApiFor(`
          model Test {@header @encode("rfc7231") param: utcDateTime};
         
          #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
          op read(...Test): void;      
        `);
      const expected: OpenAPI2Parameter = {
        name: "param",
        in: "header",
        required: true,
        type: "string",
        format: "date-time-rfc7231",
        "x-ms-parameter-location": "method",
      };
      deepStrictEqual(oapi.parameters.Test, expected);
    });
    it("set format to 'http-date' when encoding is http-date", () =>
      testEncode("utcDateTime", { type: "string", format: "http-date" }, "http-date"));
    it("set type to integer and format to 'unixtime' when encoding is unixTimestamp (unixTimestamp info is lost)", async () => {
      const expected: OpenAPI2Schema = { type: "integer", format: "unixtime" };
      await testEncode("utcDateTime", expected, "unixTimestamp", "int32");
      await testEncode("utcDateTime", expected, "unixTimestamp", "int64");
      await testEncode("utcDateTime", expected, "unixTimestamp", "int8");
      await testEncode("utcDateTime", expected, "unixTimestamp", "uint8");
    });
  });

  describe("offsetDateTime", () => {
    it("set format to 'date-time' by default", () =>
      testEncode("offsetDateTime", { type: "string", format: "date-time" }));
    it("set format to 'date-time-rfc7231' when encoding is rfc7231", () =>
      testEncode("offsetDateTime", { type: "string", format: "date-time-rfc7231" }, "rfc7231"));
    it("set format to 'http-date' when encoding is http-date", () =>
      testEncode("offsetDateTime", { type: "string", format: "http-date" }, "http-date"));
  });

  describe("duration", () => {
    it("set format to 'duration' by default", () =>
      testEncode("duration", { type: "string", format: "duration" }));
    it("set integer with int32 format setting duration as seconds", () =>
      testEncode("duration", { type: "integer", format: "int32" }, "seconds", "int32"));
  });

  describe("bytes", () => {
    it("set format to 'base64' by default", () =>
      testEncode("bytes", { type: "string", format: "byte" }));
    it("set format to base64url when encoding bytes as base64url", () =>
      testEncode("bytes", { type: "string", format: "base64url" }, "base64url"));
  });
});
