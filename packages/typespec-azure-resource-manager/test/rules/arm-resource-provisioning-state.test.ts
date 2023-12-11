import {
  BasicTestRunner,
  createLinterRuleTester,
  LinterRuleTester,
} from "@typespec/compiler/testing";
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
      "@azure-tools/typespec-azure-resource-manager"
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
          provisioningState: FooProvisioningState;
        }

        enum FooProvisioningState {
          ${RequiredValues.join(",")}
        }
        
      `
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
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message:
          "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
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
              provisioningState: State;
            }
    
            enum StateKV {Succeeded, Failed, Canceled}

            @knownValues(StateKV)
            scalar State extends string;
          `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message:
          "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
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
          provisioningState: string;
        }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
        message:
          "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
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
                provisioningState: FooProvisioningState;
              }

              enum FooProvisioningState {
                ${RequiredValues.filter((x) => x !== omit).join(",")}
              }
            `
          )
          .toEmitDiagnostics({
            code: "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state",
            message: `The "@knownValues" decorator for provisioningState, must reference an enum with 'Succeeded', 'Failed', 'Canceled' values. The enum is missing the values: [${omit}].`,
          });
      });
    });
  });
});
