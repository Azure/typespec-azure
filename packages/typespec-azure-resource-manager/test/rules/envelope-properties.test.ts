import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { envelopePropertiesRules } from "../../src/rules/envelope-properties.js";

describe("typespec-azure-resource-manager: envelope properties rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      envelopePropertiesRules,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("emit warning if updateable properties bag is empty", async () => {
    await tester
      .expect(
        `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.Foo;
      model FooResource is ProxyResource<FooResourceProperties> {
        @key("foo") @segment("foo") @path @visibility(Lifecycle.Read)
        name: string;
      }
      model FooResourceProperties {
        @visibility(Lifecycle.Read)
        bar?: string;
      }
      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources extends
        ResourceUpdate<FooResource,FooResourceProperties>,
        ResourceRead<FooResource>,
        ResourceCreate<FooResource>,
        ResourceDelete<FooResource> {}
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-resource-manager/empty-updateable-properties",
          message: `The RP-specific properties of the Resource (as defined in the 'properties' property) should have at least one updateable property.  Properties are updateable if they do not have a '@visibility' decorator, or if they include 'update' in the '@visibility' decorator arguments.`,
        },
      ]);
  });
});
