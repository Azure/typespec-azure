import { BasicTestRunner, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { LinterRuleTester } from "@typespec/compiler/testing";
import { armResourceDuplicatePropertiesRule } from "../../src/rules/arm-resource-duplicate-property.js";

describe("typespec-azure-resource-manager: arm resource properties rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceDuplicatePropertiesRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("succeed when only using allow properties at the root", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<{}> {
          @key @segment("foo") name: string;
          ...ManagedServiceIdentityProperty;
        }
      `
      )
      .toBeValid();
  });

  it("emit warning if redefining a root property in the `properties` bag", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
          ...ManagedServiceIdentityProperty;
        }

        model FooProperties {
          name: string;
          identity: string;
        }
      `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property",
          message:
            'Duplicate property "name" found in the resource envelope and resource properties.  Please do not duplicate envelope properties in resource properties.',
        },
        {
          code: "@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property",
          message:
            'Duplicate property "identity" found in the resource envelope and resource properties.  Please do not duplicate envelope properties in resource properties.',
        },
      ]);
  });
});
