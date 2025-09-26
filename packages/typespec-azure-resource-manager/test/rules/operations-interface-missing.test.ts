import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { operationsInterfaceMissingRule } from "../../src/rules/operations-interface-missing.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    operationsInterfaceMissingRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("is valid if there is an interface called Operations extending Azure.ResourceManager.Operations", async () => {
  await tester
    .expect(
      `
        @Azure.ResourceManager.armProviderNamespace
        namespace MyService;

        interface Operations extends Azure.ResourceManager.Operations {}
      `,
    )
    .toBeValid();
});

it("emit warnings if there is no interface including Azure.ResourceManager.Operations", async () => {
  await tester
    .expect(
      `
        @Azure.ResourceManager.armProviderNamespace
        namespace MyService;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint",
      message: `Arm namespace MyService is missing the Operations interface. Add "interface Operations extends Azure.ResourceManager.Operations {}".`,
    });
});
