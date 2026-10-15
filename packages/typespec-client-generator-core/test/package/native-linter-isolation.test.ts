import { createLinterRuleTester } from "@typespec/compiler/testing";
import { describe, it, vi } from "vitest";
import { useCreateForPutRule } from "../../src/rules/use-create-for-put.js";
import { useUpdateForPatchRule } from "../../src/rules/use-update-for-patch.js";
import { ArmTester } from "../tester.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});

describe("native SDK naming linter package integration", () => {
  for (const [rule, verb, prefix] of [
    [useCreateForPutRule, "put", "create"],
    [useUpdateForPatchRule, "patch", "update"],
  ] as const) {
    it(`runs ${rule.name} without loading the AutoRest emitter`, async () => {
      const tester = createLinterRuleTester(
        await ArmTester.createInstance(),
        rule,
        "@azure-tools/typespec-client-generator-core",
      );
      await tester
        .expect(
          `
          @service namespace Service;
          @${verb} @route("/invalid") op modify(): string;
          @clientName("${prefix}Widget")
          @${verb} @route("/valid") op change(): string;
        `,
        )
        .toEmitDiagnostics([
          {
            code: `@azure-tools/typespec-client-generator-core/${rule.name}`,
            severity: "warning",
            target: "modify",
            message: `${verb.toUpperCase()} SDK method name 'modify' should start with '${prefix}'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
          },
        ]);
    });
  }
});
