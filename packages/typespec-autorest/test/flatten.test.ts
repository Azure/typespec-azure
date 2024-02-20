import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: flatten", () => {
  it("tcgc flatten decorator", async () => {
    const res = await openApiFor(
      `
      @service
      namespace Test;

      model Widget {
        #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
        @flattenProperty
        properties?: WidgetProperties;
      }

      model WidgetProperties {
        prop: string;
      }

      op get(): void;
      `
    );
    const model = res.definitions["Widget"]!;
    deepStrictEqual(model, {
      properties: {
        properties: {
          "$ref": "#/definitions/WidgetProperties",
          "x-ms-client-flatten": true,
        },
      },
      type: "object",
    });
  });

  it("openapi extension decorator", async () => {
    const res = await openApiFor(
      `
      @service
      namespace Test;

      model Widget {
        @extension("x-ms-client-flatten", true)
        properties?: WidgetProperties;
      }

      model WidgetProperties {
        prop: string;
      }

      op get(): void;
      `
    );
    const model = res.definitions["Widget"]!;
    deepStrictEqual(model, {
      properties: {
        properties: {
          "$ref": "#/definitions/WidgetProperties",
          "x-ms-client-flatten": true,
        },
      },
      type: "object",
    });
  });
});
