import { expectDiagnostics } from "@typespec/compiler/testing";
import { it } from "vitest";
import { Tester } from "../tester.js";

it.each(["ArmResourceActionSync", "ArmResourceActionAsync"])(
  "requires named request bodies in %s",
  async (action) => {
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
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
        unnamed is ${action}<Widget, { name: string; }, Result>;
        named is ${action}<Widget, Request, Result>;
      }
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: { "@azure-tools/typespec-azure-core/no-unnamed-types": true },
          },
        },
      },
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/no-unnamed-types",
      message: "Anonymous model should be defined as a named model declaration.",
    });
  },
);
