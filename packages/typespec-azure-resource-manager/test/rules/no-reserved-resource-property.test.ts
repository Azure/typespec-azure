import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { noReservedResourcePropertyRule } from "../../src/rules/no-reserved-resource-property.js";

const ruleCode = "@azure-tools/typespec-azure-resource-manager/no-reserved-resource-property";

// The diagnostic always reports the reserved property using its canonical casing ("billingData"),
// regardless of how the property is cased in the spec.
function expectedMessage(_propertyName: string): string {
  return `Property "billingData" is not allowed in the resource property bag. This property name is reserved for platform billing integration.`;
}

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noReservedResourcePropertyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("valid cases", () => {
  it("is valid when the property bag has no reserved property", async () => {
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

  it("is valid when a property name only contains a reserved name as a substring", async () => {
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

  it("is valid when a reserved property is used outside of a resource property bag", async () => {
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
  it("emits a warning when a reserved property is a primitive type", async () => {
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

  it("emits a warning when a reserved property references a named model", async () => {
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

  it("emits a warning when a reserved property is an inline anonymous model", async () => {
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

  describe("matches the reserved property name case-insensitively", () => {
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

  it("emits a warning when a reserved property is inherited from a base model", async () => {
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

  it("emits a warning when a reserved property is spread into the property bag", async () => {
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
