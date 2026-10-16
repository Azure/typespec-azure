import { Tester } from "#test/tester.js";
import { createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { patchOperationsRule } from "../../src/rules/arm-resource-patch.js";
import { noUnsafePatchBodyPropertiesRule } from "../../src/rules/no-unsafe-patch-body-properties.js";
import { patchEnvelopePropertiesRules } from "../../src/rules/patch-envelope-properties.js";

describe("ARM PATCH rule interactions", () => {
  const definitions = `
    @Azure.ResourceManager.armProviderNamespace
    @service namespace Microsoft.TestService;
      model Widget is TrackedResource<{ value?: string }> {
        @key("widgetName") @segment("widgets") @path name: string;
      }
    `;
  let tester: ReturnType<typeof createLinterRuleTester>;
  beforeEach(async () => {
    tester = createLinterRuleTester(
      await Tester.createInstance(),
      noUnsafePatchBodyPropertiesRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });
  it("preserves overlapping arm-resource-patch subset diagnostics", async () => {
    const snippet = `${definitions}
        model Patch { tags?: Record<string>; extra?: string; }
        @armResourceOperations interface Widgets {
          update is ArmCustomPatchSync<Widget, Patch>;
        }
      `;
    await tester.expect(snippet).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-unsafe-patch-body-properties",
      message:
        "The property 'extra' in the request body either does not appear in the resource model or is nested at the wrong level.",
    });
    const existing = createLinterRuleTester(
      await Tester.createInstance(),
      patchOperationsRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
    await existing.expect(snippet).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
      message:
        "Resource PATCH models must be a subset of the resource type. The following properties: [extra] do not exist in resource Model 'Widget'.",
    });
  });
  it("leaves required envelope presence to patch-envelope", async () => {
    const snippet = `${definitions}
        model Patch { properties?: { value?: string }; }
        @armResourceOperations interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
          update is ArmCustomPatchSync<Widget, Patch>;
        }
      `;
    await tester.expect(snippet).toBeValid();
    const existing = createLinterRuleTester(
      await Tester.createInstance(),
      patchEnvelopePropertiesRules,
      "@azure-tools/typespec-azure-resource-manager",
    );
    await existing.expect(snippet).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/patch-envelope",
      message:
        "The Resource PATCH request for resource 'Widget' is missing envelope properties:  [tags]. Since these properties are supported in the resource, they must also be updatable via PATCH.",
    });
  });
});
