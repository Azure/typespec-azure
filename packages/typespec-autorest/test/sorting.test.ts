import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { sortOpenAPIDocument } from "../src/openapi.js";

describe("typespec-autorest: OpenAPI output should be determinstic", () => {
  it("sorts root", () => {
    const sorted = sortOpenAPIDocument({
      info: {} as any,
      paths: {},
      produces: [],
      swagger: "2.0",
      "x-ms-paths": {},
      consumes: [],
    });

    deepStrictEqual(Object.keys(sorted), [
      "swagger",
      "info",
      "produces",
      "consumes",
      "paths",
      "x-ms-paths",
    ]);
  });

  it("sorts paths", () => {
    const sorted = sortOpenAPIDocument({
      swagger: "2.0",
      info: {} as any,
      paths: {
        "/{things}/three": {},
        "/foo": {},
        "/{things}": {},
        "/foo/{things}": {},
      },
    });

    deepStrictEqual(Object.keys(sorted.paths), [
      "/{things}",
      "/{things}/three",
      "/foo",
      "/foo/{things}",
    ]);
  });

  it("sorts path verbs", () => {
    const sorted = sortOpenAPIDocument({
      swagger: "2.0",
      info: {} as any,
      paths: {
        "/": {
          delete: {} as any,
          put: {} as any,
          parameters: {} as any,
          post: {} as any,
          head: {} as any,
          options: {} as any,
          get: {} as any,
          patch: {} as any,
        },
      },
    });

    deepStrictEqual(Object.keys(sorted.paths["/"]), [
      "parameters",
      "get",
      "put",
      "post",
      "patch",
      "delete",
      "options",
      "head",
    ]);
  });
});
