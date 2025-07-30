import { Model, Operation } from "@typespec/compiler";
import { BasicTestRunner, expectDiagnostics } from "@typespec/compiler/testing";
import assert, { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getPagedResult } from "../src/decorators.js";
import { createAzureCoreTestRunner } from "./test-host.js";

describe("typespec-azure-core: decorators", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
  });

  describe("@pagedResult", () => {
    it("emit diagnostic if use on non model", async () => {
      const diagnostics = await runner.diagnose(`
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        #suppress "deprecated" "Keep for validation purposes."
        @pagedResult
        op foo(): Page<{}>;
      `);

      expectDiagnostics(diagnostics, {
        code: "decorator-wrong-target",
        message:
          "Cannot apply @pagedResult decorator to Azure.MyService.foo since it is not assignable to Model",
      });
    });

    it("marks model with @pagedResult", async () => {
      const { Foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @test @pagedResult
        model Foo {
          #suppress "deprecated" "Keep for validation purposes."
          @items
          foos: string[];

          @nextLink
          nextThing?: string;
        }
      `);
      const actual = getPagedResult(runner.program, Foo as Model);
      assert(actual?.itemsProperty?.name === "foos");
      assert(actual?.itemsPath === "foos");
      deepStrictEqual(actual?.itemsSegments, ["foos"]);
      assert(actual?.nextLinkProperty?.name === "nextThing");
      assert(actual?.nextLinkPath === "nextThing");
      deepStrictEqual(actual?.nextLinkSegments, ["nextThing"]);
    });

    it("marks non-standard model with @pagedResult", async () => {
      const { Foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @test @pagedResult
        model Foo {
          boo: {
            #suppress "deprecated" "Keep for validation purposes."
            @items
            things: string[];

            doo: {
              @nextLink
              next?: string;  
            }
          }
        }
      `);
      const actual = getPagedResult(runner.program, Foo as Model);
      assert(actual?.itemsProperty?.name === "things");
      assert(actual?.itemsPath === "boo.things");
      deepStrictEqual(actual?.itemsSegments, ["boo", "things"]);
      assert(actual?.nextLinkProperty?.name === "next");
      assert(actual?.nextLinkPath === "boo.doo.next");
      deepStrictEqual(actual?.nextLinkSegments, ["boo", "doo", "next"]);
    });

    it("allows items and nextLink property to have `.` in name", async () => {
      const { Foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @test @pagedResult
        model Foo {
          #suppress "deprecated" "Keep for validation purposes."
          @items
          \`base.things\`: string[];

          @nextLink
          \`base.next\`?: string;  
        }
      `);
      const actual = getPagedResult(runner.program, Foo as Model);
      deepStrictEqual(actual?.itemsSegments, ["base.things"]);
      deepStrictEqual(actual?.nextLinkSegments, ["base.next"]);
    });

    it("doesn't mark without @pagedResult", async () => {
      const { Foo } = await runner.compile(`
        @test
        model Foo {}
      `);

      strictEqual(getPagedResult(runner.program, Foo as Model), undefined);
    });

    it("supports pagedMetadata on operation with union return", async () => {
      const { foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @pagedResult
        model FooPage {
          #suppress "deprecated" "Keep for validation purposes."
          @items
          value?: string[];

          @nextLink
          nextLink: string;
        };
        
        @error
        model FooError {};

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @test
        op foo(): FooPage | FooError;
      `);
      const actual = getPagedResult(runner.program, foo as Operation);
      assert(actual?.itemsProperty?.name === "value");
      deepStrictEqual(actual?.itemsSegments, ["value"]);

      assert(actual?.nextLinkProperty?.name === "nextLink");
      deepStrictEqual(actual?.nextLinkSegments, ["nextLink"]);

      assert(actual?.modelType.name === "FooPage");
    });

    it("supports pagedMetadata on operation with model return", async () => {
      const { foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @pagedResult
        model FooPage {
          #suppress "deprecated" "Keep for validation purposes."
          @items
          value?: string[];

          @nextLink
          nextLink: string;
        };

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @test
        op foo(): FooPage;
      `);
      const actual = getPagedResult(runner.program, foo as Operation);
      assert(actual?.itemsProperty?.name === "value");
      deepStrictEqual(actual?.itemsSegments, ["value"]);

      assert(actual?.nextLinkProperty?.name === "nextLink");
      deepStrictEqual(actual?.nextLinkSegments, ["nextLink"]);
      assert(actual?.modelType.name === "FooPage");
    });

    it("supports pagedMetadata on operation with intersected paged model return", async () => {
      const { foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @pagedResult
        @doc(".")
        model MyPage {
          #suppress "deprecated" "Keep for validation purposes."
          @items
          @doc(".")
          value?: string[];

          @doc(".")
          nested: {
            @nextLink
            @doc(".")
            nextLink: string;
          }
        }

        @doc(".")
        model ETagParam {
          @header
          @doc(".")
          ETag?: string;
        }

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @test
        @doc(".")
        @route("/test")
        op foo is Azure.Core.Foundations.Operation<{}, ETagParam & MyPage>;
      `);
      const actual = getPagedResult(runner.program, foo as Operation);
      ok(actual?.itemsProperty?.name === "value");
      deepStrictEqual(actual?.itemsSegments, ["value"]);

      ok(actual?.nextLinkProperty?.name === "nextLink");
      deepStrictEqual(actual?.nextLinkSegments, ["nested", "nextLink"]);
      ok(actual?.modelType.name === "MyPage");
    });

    it("supports pagedMetadata on operation with inherited paged model return", async () => {
      const { foo } = await runner.compile(`
        #suppress "deprecated" "Keep for validation purposes."
        @pagedResult
        @doc(".")
        model MyPage {
          @doc(".")
          nested: {
            #suppress "deprecated" "Keep for validation purposes."
            @items
            @doc(".")
            values?: string[];

            @nextLink
            @doc(".")
            nextLink: string;
          }
        }

        @doc(".")
        model MyFooPageResult extends MyPage {
          @header
          @doc(".")
          ETag: string;
        }
        
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @test
        @doc(".")
        @route("/test")
        op foo is Azure.Core.Foundations.Operation<{}, MyFooPageResult>;
      `);
      const actual = getPagedResult(runner.program, foo as Operation);
      ok(actual?.itemsProperty?.name === "values");
      deepStrictEqual(actual?.itemsSegments, ["nested", "values"]);

      ok(actual?.nextLinkProperty?.name === "nextLink");
      deepStrictEqual(actual?.nextLinkSegments, ["nested", "nextLink"]);

      ok(actual?.modelType.name === "MyFooPageResult");
    });
  });
});
