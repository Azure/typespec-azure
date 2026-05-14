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

it("warns when child model redefines an inherited model-typed property with the same model", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Inner {
        a: string;
      }

      model Base {
        nested: Inner;
      }

      model Child extends Base {
        nested: Inner;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-replace-inherited-props",
        message:
          "The property 'nested' is also defined in the base model.  Redefining inherited properties can cause problems with OpenAPI tooling and some language representations of the models.",
      },
    ]);
});

it("warns when redefining a model-typed property from an indirect ancestor", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Inner { a: string; }

      model GrandParent {
        sharedProp: Inner;
      }

      model Parent extends GrandParent {
        midProp: string;
      }

      model Child extends Parent {
        sharedProp: Inner;
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

it("allows overriding an inherited string property with another string", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Base {
        commonProp: string;
      }

      model Child extends Base {
        commonProp: string;
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited string property with a derived scalar", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      scalar myString extends string;

      model Base {
        commonProp: string;
      }

      model Child extends Base {
        commonProp: myString;
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited string property with a closed string union", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Base {
        commonProp: string;
      }

      model Child extends Base {
        commonProp: "a" | "b";
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited string property with an open string union", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      union OpenStrings {
        string,
        "a",
        "b",
      }

      model Base {
        commonProp: string;
      }

      model Child extends Base {
        commonProp: OpenStrings;
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited numeric property with the same numeric type", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Base {
        weight: int32;
      }

      model Child extends Base {
        weight: int32;
      }
      `,
    )
    .toBeValid();
});

it("allows overriding the 'name' property of an ARM resource (string is compatible)", async () => {
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

it("allows overriding a discriminator property with a string literal", async () => {
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

it("allows overriding an inherited string property with a specific string literal value", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Parent {
        prop: string;
      }

      model Child extends Parent {
        prop: "foo";
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited numeric (int32) property with a specific numeric literal value", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Parent {
        prop: int32;
      }

      model Child extends Parent {
        prop: 12;
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited anonymous closed string union with one of its variants", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      model Parent {
        prop: "foo" | "bar";
      }

      model Child extends Parent {
        prop: "foo";
      }
      `,
    )
    .toBeValid();
});

it("allows overriding an inherited named open string union with one of its named variants", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace MyService;

      union PropType {
        Foo: "foo",
        Bar: "bar",
        string,
      }

      model Parent {
        prop: PropType;
      }

      model Child extends Parent {
        prop: PropType.Foo;
      }
      `,
    )
    .toBeValid();
});
