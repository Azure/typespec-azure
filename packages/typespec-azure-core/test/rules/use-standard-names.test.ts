import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useStandardNames } from "../../src/rules/use-standard-names.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: use-standard-names rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, useStandardNames, "@azure-tools/typespec-azure-core");
  });

  it("emits a diagnostic for operations that don't follow naming standards", async () => {
    await tester
      .expect(
        `
        model Foo {};

        model FooPage {
          @nextLink
          next: string,
          @pageItems
          value: Foo[];
        }
        
        model FooResponse<T, C> {
          @statusCode
          _: C;
          @body body: T;
        }
        
        @route("1")
        @get op returnFoo(): Foo;
        
        @route("2")
        @list
        @get op getFoos(): FooPage;
        
        @route("3")
        @put op makeFoo(@body body: Foo): FooResponse<Foo, 201>;
        
        @route("4")
        @put op wholeNewFoo(@body body: Foo): FooResponse<Foo, 200>;
        
        @route("5")
        @patch(#{implicitOptionality: true}) op changeFoo(@body body: Foo): FooResponse<Foo, 201>;
        
        @route("6")
        @delete op removeFoo(): void;        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-standard-names",
          severity: "warning",
          message: "GET operations that return single objects should start with 'get'",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-standard-names",
          severity: "warning",
          message: "GET operations that return lists should start with 'list'",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-standard-names",
          severity: "warning",
          message: "PUT operations that return 201 should start with 'create' or 'createOrReplace'",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-standard-names",
          severity: "warning",
          message:
            "PUT operations that return 200 should start with 'replace' or 'createOrReplace'",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-standard-names",
          severity: "warning",
          message:
            "PATCH operations that return 201 should start with 'create', 'update', or 'createOrUpdate'",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-standard-names",
          severity: "warning",
          message: "DELETE operations should start with 'delete'",
        },
      ]);
  });

  it("is valid for operations that follow naming standards", async () => {
    await tester
      .expect(
        `
      model Foo {};

      model FooPage {
        @nextLink
        next: string,
        @pageItems
        value: Foo[];
      }
      
      model FooResponse<T, C> {
        @statusCode
        _: C;
        @body body: T;
      }
      
      @route("1")
      @get op getFoo(): Foo;
      
      @route("2")
      @list
      @get op listFoos(): FooPage;
      
      @route("3")
      @put op createOrReplaceFoo(@body body: Foo): FooResponse<Foo, 201>;

      @route("4")
      @put op createFoo(@body body: Foo): FooResponse<Foo, 201>;

      @route("5")
      @put op replaceFoo(@body body: Foo): FooResponse<Foo, 200>;
      
      @route("6")
      @patch(#{implicitOptionality: true}) op createOrUpdateFoo(@body body: Foo): FooResponse<Foo, 201>;
      
      @route("7")
      @delete op deleteFoo(): void;        `,
      )
      .toBeValid();
  });

  it("does not emit diagnostic for operation templates", async () => {
    await tester
      .expect(
        `
        op MyOperation<T>(): T;
        
        @route("1")
        @get op getString is MyOperation<string>;
      `,
      )
      .toBeValid();
  });
});
