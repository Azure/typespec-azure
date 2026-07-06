import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { noBillingDataInPropertiesBagRule } from "../../src/rules/no-billing-data-in-properties-bag.js";

const ruleCode = "@azure-tools/typespec-azure-resource-manager/no-billing-data-in-properties-bag";

function expectedMessage(propertyName: string): string {
  return `Property "${propertyName}" is not allowed in the resource property bag. The "BillingData" property name is reserved for platform billing integration.`;
}

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noBillingDataInPropertiesBagRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("valid cases", () => {
  it("is valid when the property bag has no BillingData property", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: ResourceProvisioningState;
        }
        `,
      )
      .toBeValid();
  });

  it("is valid when a property name only contains BillingData as a substring", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          billingDataId?: string;
          currentBillingData?: string;
        }
        `,
      )
      .toBeValid();
  });

  it("is valid when BillingData is used outside of a resource property bag", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: ResourceProvisioningState;
        }

        model NotAResource {
          billingData?: string;
        }
        `,
      )
      .toBeValid();
  });
});

describe("invalid cases", () => {
  it("emits a warning when BillingData is a primitive type", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          BillingData?: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: expectedMessage("BillingData"),
      });
  });

  it("emits a warning when BillingData references a named model", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          billingData?: BillingData;
        }

        model BillingData {
          amount?: int32;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: expectedMessage("billingData"),
      });
  });

  it("emits a warning when BillingData is an inline anonymous model", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          billingData?: {
            amount?: int32;
          };
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: expectedMessage("billingData"),
      });
  });

  describe("matches the property name case-insensitively", () => {
    ["billingData", "billingdata", "BILLINGDATA", "BillingDATA"].forEach((name) => {
      it(name, async () => {
        await tester
          .expect(
            `
            @armProviderNamespace namespace MyService;

            model FooResource is TrackedResource<FooProperties> {
              @key @segment("foo") name: string;
            }

            model FooProperties {
              ${name}?: string;
            }
            `,
          )
          .toEmitDiagnostics({
            code: ruleCode,
            message: expectedMessage(name),
          });
      });
    });
  });

  it("emits a warning when BillingData is inherited from a base model", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties extends BaseProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: ResourceProvisioningState;
        }

        model BaseProperties {
          billingData?: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: expectedMessage("billingData"),
      });
  });

  it("emits a warning when BillingData is spread into the property bag", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model FooResource is TrackedResource<FooProperties> {
          @key @segment("foo") name: string;
        }

        model FooProperties {
          ...BillingBag;
        }

        model BillingBag {
          billingData?: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: expectedMessage("billingData"),
      });
  });
});
