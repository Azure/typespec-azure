import { createLinterRuleTester } from "@typespec/compiler/testing";
import { it, vi } from "vitest";
import { lroMissingPollingMetadataRule } from "../../src/rules/lro-missing-polling-metadata.js";
import { Tester } from "../tester.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

it("checks polling metadata without emitter or TCGC packages", async () => {
  const tester = createLinterRuleTester(
    await Tester.createInstance(),
    lroMissingPollingMetadataRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await tester
    .expect(
      `
      @service namespace SelectedArmProgram;
      model Accepted { @statusCode statusCode: 202; @header("Location") location?: string; }
      @patch @route("/widgets") op update(): Accepted;
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata",
      message: lroMissingPollingMetadataRule.messages.default,
    });
});
