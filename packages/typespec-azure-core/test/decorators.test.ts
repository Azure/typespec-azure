import { Interface, Model, Operation } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import assert, { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getOperationLinks, getPagedResult, OperationLinkMetadata } from "../src/decorators.js";
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

  describe("@operationLink", () => {
    it("works for sample usage", async () => {
      const code = `
      using Rest.Resource;
      
      model MyResource {
        @key("resourceName")
        @segment("resources")
        name: string;
      };

      model LroResponseWithCompletion<T> {
        @statusCode code: "202";
        @header("x-ms-operation-id") operationId: string;
      }
      
      model ResourceStatus {
        statusId: string;
        status: "InProgress" | "Canceled" | "Succeeded" | "Failed";
      }
      
      @test
      @autoRoute
      interface Foo {
        @get read is Azure.Core.StandardResourceOperations.ResourceRead<MyResource>;

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @get status(...KeysOf<MyResource>, @path @segment("statuses") statusId: string) : ResourceStatus | Foundations.ErrorResponse;

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @pollingOperation(Foo.status, {resourceName: RequestParameter<"name">, statusId: ResponseProperty<"operationId">})
        @finalOperation(Foo.read, {resourceName: RequestParameter<"name">})
        @put createOrUpdate(...KeysOf<MyResource>, @body body: MyResource) : LroResponseWithCompletion<MyResource> | Foundations.ErrorResponse;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnosticEmpty(diagnostics);

      const { Foo } = (await runner.compile(code)) as { Foo: Interface };

      const result = getOperationLinks(
        runner.program,
        Foo.operations.get("createOrUpdate")!,
      ) as Map<string, OperationLinkMetadata>;
      assert(result !== undefined);
      assert(result.get("final") !== undefined);
      assert(result.get("polling") !== undefined);
    });

    it("raises diagnostic if RequestParameter or ResponseProperty are not used", async () => {
      const code = `
      using Rest.Resource;
      
      model FooBody {
        id: string;
      }

      model FooResult {
        resultId: string;
      }

      @test
      interface Foo {
        @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

        @pollingOperation(Foo.bar, {poll: string})
        @put foo(@body body: FooBody): FooResult;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/operation-link-parameter-invalid",
        message: "Parameters must be of template type RequestParameter<T> or ResponseProperty<T>.",
      });
    });

    it("raises diagnostic if parameter does not exist on linked operation", async () => {
      const code = `
      using Rest.Resource;
      
      model FooBody {
        id: string;
      }

      model FooResult {
        resultId: string;
      }

      @test
      interface Foo {
        @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

        @pollingOperation(Foo.bar, {poll: RequestParameter<"resourceName">})
        @put foo(@body body: FooBody): FooResult;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/operation-link-parameter-invalid-target",
        message: "Request parameter 'poll' not found in linked operation.",
      });
    });

    it("raises diagnostic if requestParameter does not exist", async () => {
      const code = `
      using Rest.Resource;
      
      model FooBody {
        id: string;
      }

      model FooResult {
        resultId: string;
      }

      @test
      interface Foo {
        @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

        @pollingOperation(Foo.bar, {statusId: RequestParameter<"resourceName">})
        @put foo(@body body: FooBody): FooResult;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/request-parameter-invalid",
        message: "Request parameter 'resourceName' not found on request body model.",
      });
    });

    it("passes if requestParameter exists", async () => {
      const code = `
      using Rest.Resource;
      
      model FooBody {
        id: string;
      }

      model FooResult {
        resultId: string;
      }

      @test
      interface Foo {
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @pollingOperation(Foo.bar, {statusId: RequestParameter<"id">})
        @put foo(@body body: FooBody): FooResult;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnosticEmpty(diagnostics);
    });

    it("raises diagnostic if responseProperty does not exist", async () => {
      const code = `
      using Rest.Resource;
      
      model FooBody {
        id: string;
      }

      model FooResult {
        @statusCode code: 202;
        resultId: string;
      }

      @test
      interface Foo {
        @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

        @pollingOperation(Foo.bar, {statusId: ResponseProperty<"poll">})
        @put foo(@body body: FooBody): FooResult | Foundations.ErrorResponse;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/response-property-invalid",
        message: "Response property 'poll' not found on success response model.",
      });
    });

    it("passes if responseProperty exists", async () => {
      const code = `
      using Rest.Resource;
      
      model FooBody {
        id: string;
      }
  
      model FooResult {
        @statusCode code: 202;
        resultId: string;
      }
  
      @test
      interface Foo {
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @pollingOperation(Foo.bar, {statusId: ResponseProperty<"resultId">})
        @put foo(@body body: FooBody): FooResult | Foundations.ErrorResponse;
      }
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnosticEmpty(diagnostics);
    });
  });

  describe("@pollingOperation", () => {
    it("emit error if response of operation is a scalar", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @put op foo(): string;

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): string;
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/polling-operation-return-model",
        message:
          "An operation annotated with @pollingOperation must return a model or union of model.",
      });
    });

    it("emit error if response of operation is union with a scalar", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @put op foo(): {@statusCode _: 200} | string;

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): string;
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/polling-operation-return-model",
        message:
          "An operation annotated with @pollingOperation must return a model or union of model.",
      });
    });

    it("succeed if response is a model", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @put op foo(): {};

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): {status: "Succeeded" | "Failed" | "Canceled"};
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnosticEmpty(diagnostics);
    });

    it("succeed if response is a union of model", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @put op foo(): {@statusCode _: 200} | {@statusCode _: 201};

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): {status: "Succeeded" | "Failed" | "Canceled"};
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnosticEmpty(diagnostics);
    });
  });
});
