import { Tester } from "#test/tester.js";
import { createLinterRuleTester, TesterInstance } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { LinterRuleTester } from "@typespec/compiler/testing";
import { armResourceDuplicatePropertiesRule } from "../../src/rules/arm-resource-duplicate-property.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceDuplicatePropertiesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("succeed when only using allow properties at the root", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<{}> {
          @key @segment("foo") name: string;
          ...ManagedServiceIdentityProperty;
        }
      `,
    )
    .toBeValid();
});

it("emit warning if redefining a root property in the `properties` bag", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
          ...ManagedServiceIdentityProperty;
        }

        model FooProperties {
          name: string;
          identity: string;
        }
      `,
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
