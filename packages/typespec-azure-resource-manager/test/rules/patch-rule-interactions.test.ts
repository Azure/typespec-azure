import { Tester } from "#test/tester.js";
import { createLinterRuleTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";
import { patchOperationsRule } from "../../src/rules/arm-resource-patch.js";
import { useOperationDecoratorRule } from "../../src/rules/use-operation-decorator.js";

describe("ARM PATCH rule interactions", () => {
  it("does not assume resource identity and registration imply writable-input transitivity", async () => {
    const source = `
      @service @armProviderNamespace namespace Microsoft.TestService;
      model Widget is TrackedResource<{
        common?: string;
        @visibility(Lifecycle.Update) updateOnly?: string;
      }> { ...ResourceNameParameter<Widget>; }
      model WidgetPatch {
        tags?: Record<string>;
        properties?: { updateOnly?: string; };
      }
      @armResourceOperations interface Widgets {
        @parameterVisibility(Lifecycle.Create)
        create is ArmResourceCreateOrReplaceSync<Widget>;
        update is ArmCustomPatchSync<Widget, PatchModel = WidgetPatch>;
      }
    `;
    for (const rule of [armResourceOperationsRule, useOperationDecoratorRule]) {
      await createLinterRuleTester(
        await Tester.createInstance(),
        rule,
        "@azure-tools/typespec-azure-resource-manager",
      )
        .expect(source)
        .toBeValid();
    }
    await createLinterRuleTester(
      await Tester.createInstance(),
      patchOperationsRule,
      "@azure-tools/typespec-azure-resource-manager",
    )
      .expect(source)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "The property 'updateOnly' in the PATCH body does not correspond to a property in the PUT body.",
        target: "updateOnly",
      });
  });
});
