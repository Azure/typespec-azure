import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armCommonDefinitionExcludedRule } from "../../src/rules/arm-common-definition-excluded.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armCommonDefinitionExcludedRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when using CustomerManagedKeyEncryption directly in a user spec", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      @versioned(Microsoft.Contoso.Versions)
      @armProviderNamespace
      namespace Microsoft.Contoso;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
        v4;
      }

      @added(Microsoft.Contoso.Versions.v4)
      model EncryptionConfig {
        #suppress "deprecated" "Testing arm-common-definition-excluded rule"
        customerManagedKey: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-definition-excluded",
    });
});

it("does not emit diagnostic when using CustomerManagedKeyEncryption via Encryption wrapper", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test" })
      @versioned(Microsoft.Contoso.Versions)
      @armProviderNamespace
      namespace Microsoft.Contoso;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
        v4;
      }

      @added(Microsoft.Contoso.Versions.v4)
      model ResourceProperties {
        encryption?: Azure.ResourceManager.CommonTypes.Encryption;
      }
    `,
    )
    .toBeValid();
});

it("does not emit diagnostic when using Foundations.CustomerManagedKeyEncryptionV4", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Contoso;

      model EncryptionConfig {
        customerManagedKey: Azure.ResourceManager.Foundations.CustomerManagedKeyEncryptionV4;
      }
    `,
    )
    .toBeValid();
});

