import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { armResourceEnvelopeProperties } from "../../src/rules/arm-resource-invalid-envelope-property.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: arm resource properties rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceEnvelopeProperties,
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
          ...ManagedServiceIdentity;
        }
      `
      )
      .toBeValid();
  });

  it("emit warning if using non allowed property name at the root of the resource object", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<{}> {
          @key @segment("foo") name: string;

          disallowed?: string;
        }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property",
        message:
          'Property "disallowed" is not valid in the resource envelope.  Please remove this property, or add it to the resource-specific property bag.',
      });
  });
});
