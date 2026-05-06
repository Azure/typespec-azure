import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armNoReplaceInheritedPropsRule } from "../../src/rules/arm-no-replace-inherited-props.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armNoReplaceInheritedPropsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("succeeds when child model does not redefine inherited properties", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Base {
        id: string;
      }

      model Child extends Base {
        otherProp: string;
      }
      `,
    )
    .toBeValid();
});

it("emits warning when child model redefines an inherited property", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Base {
        id: string;
        commonProp: string;
      }

      model Child extends Base {
        commonProp: string;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props",
        message:
          "The property 'commonProp' is also defined in the base model.  Redefining inherited properties can cause problems with OpenAPI tooling and some language representations of the models.",
      },
    ]);
});

it("emits warning when redefining a property from an indirect ancestor", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model GrandParent {
        sharedProp: string;
      }

      model Parent extends GrandParent {
        midProp: string;
      }

      model Child extends Parent {
        sharedProp: string;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props",
        message:
          "The property 'sharedProp' is also defined in the base model.  Redefining inherited properties can cause problems with OpenAPI tooling and some language representations of the models.",
      },
    ]);
});

it("does not warn when redefining the 'name' property of an ARM resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model FooResource is TrackedResource<{}> {
        @key @segment("foo") name: string;
      }
      `,
    )
    .toBeValid();
});

it("does not warn when redefining a discriminator property in a derived model", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      @discriminator("kind")
      model Pet {
        kind: string;
        weight: int32;
      }

      model Cat extends Pet {
        kind: "cat";
        meow: boolean;
      }
      `,
    )
    .toBeValid();
});

it("warns on non-discriminator inherited properties even when base has @discriminator", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      @discriminator("kind")
      model Pet {
        kind: string;
        weight: int32;
      }

      model Cat extends Pet {
        kind: "cat";
        weight: int32;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props",
        message:
          "The property 'weight' is also defined in the base model.  Redefining inherited properties can cause problems with OpenAPI tooling and some language representations of the models.",
      },
    ]);
});
