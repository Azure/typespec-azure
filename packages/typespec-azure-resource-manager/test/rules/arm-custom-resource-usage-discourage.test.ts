import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armCustomResourceUsageDiscourage } from "../../src/rules/arm-custom-resource-usage-discourage.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
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
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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
