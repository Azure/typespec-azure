import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armFeatureFileUsageDiscourage } from "../../src/rules/arm-feature-file-usage-discourage.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armFeatureFileUsageDiscourage,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when using @featureFiles decorator", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        @Azure.ResourceManager.featureFiles(Features)
        namespace Microsoft.Contoso;

        enum Features {
          FeatureA: "Feature A",
        }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-feature-file-usage-discourage",
    });
});

it("does not emit diagnostic when @featureFiles is not used", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Contoso;
    `,
    )
    .toBeValid();
});

it("does not emit diagnostic when Legacy @features decorator is used", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        @Azure.ResourceManager.Legacy.features(Features)
        namespace Microsoft.Contoso;

        enum Features {
          FeatureA: "Feature A",
        }
    `,
    )
    .toBeValid();
});
