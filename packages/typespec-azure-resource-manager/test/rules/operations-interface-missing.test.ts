import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { operationsInterfaceMissingRule } from "../../src/rules/operations-interface-missing.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: Operations interface missing rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      operationsInterfaceMissingRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("is valid if there is an interface called Operations extending Azure.ResourceManager.Operations", async () => {
    await tester
      .expect(
        `
        @Azure.ResourceManager.armProviderNamespace
        namespace MyService;

        interface Operations extends Azure.ResourceManager.Operations {}
      `
      )
      .toBeValid();
  });

  it("emit warnings if there is no interface including Azure.ResourceManager.Operations", async () => {
    await tester
      .expect(
        `
        @Azure.ResourceManager.armProviderNamespace
        namespace MyService;
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint",
        message: `Arm namespace MyService is missing the Operations interface. Add "interface Operations extends Azure.ResourceManager.Operations {}".`,
      });
  });
});
