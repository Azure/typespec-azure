import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { armResourceProvisioningStateRule } from "../../src/rules/arm-resource-provisioning-state-rule.js";

const RequiredValues = ["Succeeded", "Failed", "Canceled"];

describe("typespec-azure-resource-manager: arm resource provisioning state rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceProvisioningStateRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("succeed when segment is not using any invalid chars", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: FooProvisioningState;
        }

        enum FooProvisioningState {
          ${RequiredValues.join(",")}
        }
        
      `,
      )
      .toBeValid();
  });

  it("succeed with union", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: FooProvisioningState;
        }

        union FooProvisioningState {
          ${RequiredValues.map((x) => `${x}: "${x}"`).join(",")}
        }
        
      `,
      )
      .toBeValid();
  });

  it("emit warning if resource has no provisioning state property", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<{}> {
          @key @segment("foo") name: string;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message:
          "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum or a union of string values, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
      });
  });

  it("emit warning if provisioning state is not an enum", async () => {
    await tester
      .expect(
        `
            @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;
    
            model FooResource is TrackedResource<FooProperties> {
              @key @segment("foo") name: string;
            }
    
            model FooProperties {
              @visibility(Lifecycle.Read)
              provisioningState?: State;
            }
    
            scalar State extends string;
          `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message:
          "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum or a union of string values, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
      });
  });

  it("emit warning if provisioning state is missing @knownValues", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: string;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message:
          "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum or a union of string values, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
      });
  });

  it("emit warning if provisioning state is not optional", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read)
          provisioningState: ResourceProvisioningState;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message: "The provisioningState property must be optional.",
      });
  });

  it("emit warning if provisioning doesn't have read visibility", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          provisioningState?: ResourceProvisioningState;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message: "The provisioningState property must have a single read visibility.",
      });
  });

  it("emit warning if provisioning more than read visibility", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read, Lifecycle.Update)          
          provisioningState?: ResourceProvisioningState;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message: "The provisioningState property must have a single read visibility.",
      });
  });

  describe("emit diagnostic when missing known values", () => {
    RequiredValues.forEach((omit) => {
      it(omit, async () => {
        await tester
          .expect(
            `
              @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;
      
              model FooResource is TrackedResource<FooProperties> {
                @key @segment("foo") name: string;
              }
      
              model FooProperties {
                @visibility(Lifecycle.Read)
                provisioningState?: FooProvisioningState;
              }

              enum FooProvisioningState {
                ${RequiredValues.filter((x) => x !== omit).join(",")}
              }
            `,
          )
          .toEmitDiagnostics({
            code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
            message: `provisioningState, must reference an enum with 'Succeeded', 'Failed', 'Canceled' values. The enum is missing the values: [${omit}].`,
          });
      });
    });
  });
});
