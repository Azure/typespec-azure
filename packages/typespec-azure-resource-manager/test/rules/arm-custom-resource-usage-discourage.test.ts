import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armCustomResourceUsageDiscourage } from "../../src/rules/arm-custom-resource-usage-discourage.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armCustomResourceUsageDiscourage,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when using @Azure.ResourceManager.Legacy.customAzureResource decorator", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
              namespace Microsoft.Contoso;
        
        @Azure.ResourceManager.Legacy.customAzureResource
        model Person {
          name: string;
        }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-custom-resource-usage-discourage",
    });
});

it("emits diagnostic for models inheriting from unsuppressed custom resource templates", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Contoso;

        @Azure.ResourceManager.Legacy.customAzureResource
        model CustomAzureResource<T extends boolean> {}

        model Person is CustomAzureResource<true> {
          name: string;
        }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-custom-resource-usage-discourage",
    });
});

it("does not emit diagnostic for models inheriting from suppressed custom resource templates", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Contoso;

        #suppress "@azure-tools/typespec-azure-resource-manager/arm-custom-resource-usage-discourage" "Template usage is intentional."
        @Azure.ResourceManager.Legacy.customAzureResource
        model CustomAzureResource<T extends boolean> {}

        model Person is CustomAzureResource<true> {
          name: string;
        }
    `,
    )
    .toBeValid();
});
