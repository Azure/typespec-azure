import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armCustomResourceNoKey } from "../../src/rules/arm-custom-resource-no-key.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await createAzureResourceManagerTestRunner(),
    armCustomResourceNoKey,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when missing @key on custom resource", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;
    
    @Azure.ResourceManager.Legacy.customAzureResource
    model CustomResource {
      someId: string;
    }
  `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-custom-resource-no-key",
    });
});

it("allows custom resource with @key", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;
    
    @Azure.ResourceManager.Legacy.customAzureResource
    model CustomResource {
      @key
      someId: string;
    }
  `,
    )
    .toBeValid();
});
