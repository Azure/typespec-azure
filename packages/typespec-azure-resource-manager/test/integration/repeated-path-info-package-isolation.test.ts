import { createLinterRuleTester } from "@typespec/compiler/testing";
import { it, vi } from "vitest";
import { noRepeatedPathInfoRule } from "../../src/rules/no-repeated-path-info.js";
import { Tester } from "../tester.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("Native lint must not load TCGC.");
});

it("checks URI duplication without loading emitter or TCGC packages", async () => {
  const tester = createLinterRuleTester(
    await Tester.createInstance(),
    noRepeatedPathInfoRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await tester
    .expect(
      `
      @put @route("/widgets/{widgetName}")
      op create(@path widgetName: string, @body body: {
        properties: { widgetName?: string; }
      }): void;
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-repeated-path-info",
      message:
        "Request body property 'widgetName' repeats information already carried in the path or query.",
    });
});
