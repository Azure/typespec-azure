import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { interfacesRule } from "../../src/rules/arm-resource-interfaces.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    interfacesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Detects interfaces without @armResourceOperations", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @visibility(Lifecycle.Read)
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
      }

      interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}

      enum ResourceState {
        Succeeded,
        Canceled,
        Failed
      }

      model FooProperties {
        displayName?: string = "default";
        provisioningState: ResourceState;
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator",
      message: "Each resource interface must have an @armResourceOperations decorator.",
    });
});
