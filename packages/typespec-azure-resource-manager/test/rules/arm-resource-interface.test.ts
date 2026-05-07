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

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }

      interface FooResources extends TrackedResourceOperations<FooResource, {}> {}
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator",
      message: "Each resource interface must have an @armResourceOperations decorator.",
    });
});
