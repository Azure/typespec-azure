import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: encode with merge patch", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("encode propagated to merge patch model properties", async () => {
    await runner.compileWithBuiltInService(`
      import "@typespec/http";
      using Http;

      model Widget {
        @visibility(Lifecycle.Read)
        id: string;

        @encode(ArrayEncoding.commaDelimited)
        requiredColors: string[];

        @encode(ArrayEncoding.spaceDelimited)
        optionalColors?: string[];
      }

      @route("/widgets")
      interface Widgets {
        @patch 
        update(
          @path id: Widget.id,
          @body @header contentType: "application/merge-patch+json" widget: Widget,
        ): Widget;
      }
    `);

    const models = runner.context.sdkPackage.models;
    const widgetModel = models.find((m) => m.name === "Widget");
    strictEqual(widgetModel?.kind, "model");
    
    const requiredColorsProp = widgetModel?.properties.find((p) => p.name === "requiredColors");
    strictEqual(requiredColorsProp?.encode, "commaDelimited");
    strictEqual(requiredColorsProp?.type.kind, "array");
    
    const optionalColorsProp = widgetModel?.properties.find((p) => p.name === "optionalColors");
    strictEqual(optionalColorsProp?.encode, "spaceDelimited");
    strictEqual(optionalColorsProp?.type.kind, "array");
  });
});
