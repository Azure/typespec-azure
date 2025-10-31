import { deepStrictEqual } from "assert";
import { expect, it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

it("applies x-ms-client-flatten for property marked with @flattenProperty", async () => {
  const res = await compileOpenAPI(
    `
    model Widget {
      #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "for test"
      @Azure.ClientGenerator.Core.Legacy.flattenProperty
      properties?: WidgetProperties;
    }

    model WidgetProperties {
    }
    `,
    { preset: "azure" },
  );
  const model = res.definitions?.["Widget"]!;
  deepStrictEqual(model, {
    properties: {
      properties: {
        $ref: "#/definitions/WidgetProperties",
        "x-ms-client-flatten": true,
      },
    },
    type: "object",
  });
});

it("applies x-ms-client-flatten for body parameter with @flattenProperty", async () => {
  const res = await compileOpenAPI(
    `
    model Widget {
      properties?: WidgetProperties;
    }

    model WidgetProperties {
    }

    @route("/widgets")
    @put op createWidget(
      #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "for test"
      @body @Azure.ClientGenerator.Core.Legacy.flattenProperty widget: Widget
    ): Widget;
    `,
    { preset: "azure" },
  );
  const bodyParam = res.paths?.["/widgets"]?.["put"]?.parameters[0];
  expect(bodyParam).toMatchObject({
    in: "body",
    name: "widget",
    required: true,
    schema: { $ref: "#/definitions/Widget" },
    "x-ms-client-flatten": true,
  });
});
