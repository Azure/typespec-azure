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
