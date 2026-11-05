import { $linter } from "@azure-tools/typespec-azure-core";
import { createLinterRuleTester } from "@typespec/compiler/testing";
import { it } from "vitest";
import { Tester } from "../tester.js";

it.each(["ArmResourceActionSync", "ArmResourceActionAsync"])(
  "requires named request bodies in %s",
  async (action) => {
    const runner = await Tester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      $linter.rules!.find((rule) => rule.name === "no-unnamed-types")!,
      "@azure-tools/typespec-azure-core",
    );
    const fixture = (body: string) => `
      using Azure.Core;
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<Widget>;
      }
      model WidgetProperties {
        @visibility(Lifecycle.Read) provisioningState?: ProvisioningState;
      }
      @lroStatus union ProvisioningState { string, ResourceProvisioningState }
      model Request { name: string; }
      model Result { result: string; }
      @armResourceOperations interface Widgets {
        action is ${action}<Widget, ${body}, Result>;
      }
    `;

    await tester.expect(fixture("{ name: string; }")).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-unnamed-types",
      message: "Anonymous model should be defined as a named model declaration.",
    });
    await tester.expect(fixture("Request")).toBeValid();
  },
);
