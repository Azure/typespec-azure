import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { resourcePropertiesValidationRule } from "../../src/rules/resource-properties-validation.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    resourcePropertiesValidationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("resource identity properties", () => {
  it("accepts standard read-only resource properties", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }
        `,
      )
      .toBeValid();
  });

  it("reports a resource identity property that is writable", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;

          @visibility(Lifecycle.Read, Lifecycle.Create)
          id?: Azure.Core.armResourceIdentifier;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
        message:
          "ARM resource 'FooResource' must define read-only 'name', 'id', and 'type' properties.",
      });
  });

  it("reports a required property whose wire name is changed", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;

          @encodedName("application/json", "resourceIdentifier")
          id?: Azure.Core.armResourceIdentifier;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
        message:
          "ARM resource 'FooResource' must define read-only 'name', 'id', and 'type' properties.",
      });
  });
});

describe("resource tags", () => {
  it("accepts inherited string-valued tags", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }
        `,
      )
      .toBeValid();
  });

  it("accepts tags with string enum values", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        enum TagValue {
          First,
          Second,
        }

        model FooResource is ProxyResource<{}> {
          ...ResourceNameParameter<FooResource>;
          tags?: Record<TagValue>;
        }
        `,
      )
      .toBeValid();
  });

  it("accepts nullable tags with string values", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is ProxyResource<{}> {
          ...ResourceNameParameter<FooResource>;
          tags?: Record<string> | null;
        }
        `,
      )
      .toBeValid();
  });

  it.each([
    "Record<int32> | null",
    "Record<string | null> | null",
    "Record<string> | string | null",
  ])("reports invalid nullable tags: %s", async (tagsType) => {
    await tester
      .expect(
        `
          @armProviderNamespace
          namespace Microsoft.Foo;

          model FooResource is ProxyResource<{}> {
            ...ResourceNameParameter<FooResource>;
            tags?: ${tagsType};
          }
          `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
        message: "The resource 'tags' property must be a record with string values.",
      });
  });

  it("reports tags with non-string values on a proxy resource", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is ProxyResource<{}> {
          ...ResourceNameParameter<FooResource>;
          tags?: Record<int32>;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
        message: "The resource 'tags' property must be a record with string values.",
      });
  });

  it("reports a non-string property encoded as resource tags", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;

          @encodedName("application/json", "tags")
          labels?: Record<int32>;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
        message: "The resource 'tags' property must be a record with string values.",
      });
  });

  it("does not require tags on proxy resources", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is ProxyResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }
        `,
      )
      .toBeValid();
  });
});
