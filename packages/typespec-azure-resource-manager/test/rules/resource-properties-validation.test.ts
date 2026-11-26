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
  it("accepts standard read-only properties and inherited string tags", async () => {
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

  it("reports missing or writable resource identity properties", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model WritableResource is TrackedResource<{}> {
          ...ResourceNameParameter<WritableResource>;

          @visibility(Lifecycle.Read, Lifecycle.Create)
          id?: Azure.Core.armResourceIdentifier;
        }

        model RenamedResource is TrackedResource<{}> {
          ...ResourceNameParameter<RenamedResource>;

          @encodedName("application/json", "resourceIdentifier")
          id?: Azure.Core.armResourceIdentifier;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
          message:
            "ARM resource 'WritableResource' must define read-only 'name', 'id', and 'type' properties.",
        },
        {
          code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
          message:
            "ARM resource 'RenamedResource' must define read-only 'name', 'id', and 'type' properties.",
        },
      ]);
  });
});

describe("resource tags", () => {
  it("accepts absent or string-valued tags", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        enum TagValue {
          First,
          Second,
        }

        model WithoutTags is ProxyResource<{}> {
          ...ResourceNameParameter<WithoutTags>;
        }

        model EnumTags is ProxyResource<{}> {
          ...ResourceNameParameter<EnumTags>;
          tags?: Record<TagValue>;
        }

        model NullableTags is ProxyResource<{}> {
          ...ResourceNameParameter<NullableTags>;
          tags?: Record<string> | null;
        }
        `,
      )
      .toBeValid();
  });

  it("reports tags that are not string-valued records", async () => {
    const diagnostic = {
      code: "@azure-tools/typespec-azure-resource-manager/resource-properties-validation",
      message: "The resource 'tags' property must be a record with string values.",
    };

    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model NonStringTags is ProxyResource<{}> {
          ...ResourceNameParameter<NonStringTags>;
          tags?: Record<int32>;
        }

        model NullableTagValues is ProxyResource<{}> {
          ...ResourceNameParameter<NullableTagValues>;
          tags?: Record<string | null> | null;
        }

        model NonRecordTags is ProxyResource<{}> {
          ...ResourceNameParameter<NonRecordTags>;
          tags?: Record<string> | string | null;
        }

        model EncodedTags is TrackedResource<{}> {
          ...ResourceNameParameter<EncodedTags>;

          @encodedName("application/json", "tags")
          labels?: Record<int32>;
        }
        `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic, diagnostic, diagnostic]);
  });
});
