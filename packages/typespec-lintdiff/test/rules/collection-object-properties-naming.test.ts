import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { collectionObjectPropertiesNamingRule } from "../../src/rules/collection-object-properties-naming.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "Azure.ResourceManager");

let tester: ReturnType<typeof createLinterRuleTester>;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    collectionObjectPropertiesNamingRule,
    "tsp-lintdiff-local-linter",
  );
});

it("checks a pageable ARM POST action without an OpenAPI decorator", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test" })
      namespace Microsoft.Test;

      model Results {
        @pageItems items: string[];
        @nextLink nextLink?: string;
      }

      @route("/items")
      @post
      @list
      op listItems(): Results;
    `,
    )
    .toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/collection-object-properties-naming",
      message: "Paged ARM list responses must declare a 'value' property of array type.",
    });
});

it("checks a scalar value even when another property supplies page items", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test" })
      namespace Microsoft.Test;

      model Results {
        value: string;
        @pageItems items: string[];
        @nextLink nextLink?: string;
      }

      @route("/items")
      @get
      @list
      op listItems(): Results;
    `,
    )
    .toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/collection-object-properties-naming",
      message: "Paged ARM list responses must declare a 'value' property of array type.",
    });
});

it("accepts a value array and does not require a generated operation ID", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "Test" })
      namespace Microsoft.Test;

      model Results {
        @pageItems value: string[];
        @nextLink nextLink?: string;
      }

      @route("/items")
      @get
      @list
      op fetchItems(): Results;
    `,
    )
    .toBeValid();
});
