import { Enum, Interface, Model, ModelProperty, Operation } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import assert, { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  OperationLinkMetadata,
  getFinalStateOverride,
  getLongRunningStates,
  getOperationLinks,
  getPagedResult,
  getParameterizedNextLinkArguments,
  isFixed,
} from "../src/decorators.js";
import { FinalStateValue } from "../src/lro-helpers.js";
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
        @test @pagedResult
        model Foo {
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
        @test @pagedResult
        model Foo {
          boo: {
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
        @test @pagedResult
        model Foo {
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

    it("supports Page<T> template", async () => {
      const { Foo } = await runner.compile(`
        @test 
        model Foo is Page<{}> {}
      `);
      const actual = getPagedResult(runner.program, Foo as Model);
      assert(actual?.itemsProperty?.name === "value");
      deepStrictEqual(actual?.itemsSegments, ["value"]);

      assert(actual?.nextLinkProperty?.name === "nextLink");
      deepStrictEqual(actual?.nextLinkSegments, ["nextLink"]);
    });

    it("supports pagedMetadata on operation with union return", async () => {
      const { foo } = await runner.compile(`
        model FooPage is Page<{}>;
        
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
        model FooPage is Page<{}>;

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
        @pagedResult
        @doc(".")
        model MyPage {
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
        @pagedResult
        @doc(".")
        model MyPage {
          @doc(".")
          nested: {
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

    it("supports @nextPageOperation", async () => {
      const code = `
      using TypeSpec.Rest.Resource;

      model MyResource {
        @key
        @segment("resourceName")
        name: string;
      };

      @test
      interface Foo {
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
        @route("fooPage/")
        @get nextPage is Azure.Core.Foundations.Operation<{ nextLink: string }, Azure.Core.Page<MyResource>>;

        @nextPageOperation(Foo.nextPage, { nextLink: ResponseProperty<"nextLink"> })
        list is Azure.Core.ResourceList<MyResource>;
      }
      `;
      const [result, diagnostics] = await runner.compileAndDiagnose(code);
      expectDiagnosticEmpty(diagnostics);

      const { Foo } = result as { Foo: Interface };

      const pagedResult = getPagedResult(runner.program, Foo.operations.get("list")!);
      strictEqual(pagedResult?.nextLinkOperation?.name, "nextPage");
    });
  });

  describe("@lroStatus", () => {
    it("emits diagnostic if used on wrong type", async () => {
      const diagnostics = await runner.diagnose(`
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
        @lroStatus
        op foo(): Page<{}>;

        @lroStatus
        interface Foo {
        }
      `);

      expectDiagnostics(diagnostics, [
        {
          code: "decorator-wrong-target",
          message:
            "Cannot apply @lroStatus decorator to Azure.MyService.foo since it is not assignable to Enum | Union | ModelProperty",
        },
        {
          code: "decorator-wrong-target",
          message:
            "Cannot apply @lroStatus decorator to Azure.MyService.Foo since it is not assignable to Enum | Union | ModelProperty",
        },
      ]);
    });

    it("emits diagnostic when model property type isn't valid", async () => {
      const diagnostics = await runner.diagnose(`
        model BadStatusType {
          @lroStatus status: int32;
        }

        model BadUnionType {
          @lroStatus status: "Succeeded" | int64;
        }
      `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/lro-status-property-invalid-type",
          message: "Property type must be a union of strings or an enum.",
        },
        {
          code: "@azure-tools/typespec-azure-core/lro-status-union-non-string",
          message: "Union contains non-string value type Scalar.",
        },
        {
          code: "@azure-tools/typespec-azure-core/lro-status-missing",
          message: "Terminal long-running operation states are missing: Failed.",
        },
      ]);
    });

    it("emits diagnostic when standard terminal states are missing", async () => {
      const diagnostics = await runner.diagnose(`
        model UnionMissingStates {
          @lroStatus status: "Completed" | "Failed" | "Cancelled" | "Working" | "Extra";
        }

        @lroStatus
        enum EnumMissingStates {
          Succeeded, Error, Cancelled
        }
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/lro-status-missing",
          message: "Terminal long-running operation states are missing: Succeeded.",
        },
        {
          code: "@azure-tools/typespec-azure-core/lro-status-missing",
          message: "Terminal long-running operation states are missing: Failed.",
        },
      ]);
    });

    it("returns LRO states from a string union", async () => {
      const { StatusModel } = (await runner.compile(`
        @test
        model StatusModel {
          @lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Working" | "Extra";
        }
`)) as { StatusModel: Model };

      deepStrictEqual(getLongRunningStates(runner.program, StatusModel.properties.get("status")!), {
        succeededState: ["Succeeded"],
        failedState: ["Failed"],
        canceledState: ["Canceled"],
        states: ["Succeeded", "Failed", "Canceled", "Working", "Extra"],
      });
    });

    it("returns LRO states from an enum type", async () => {
      const { DefaultLroStates, CustomLroStates } = (await runner.compile(`
        @test
        @lroStatus
        enum DefaultLroStates {
          Succeeded,
          Failed,
          Canceled,
          Extra,
        }

        @test
        @lroStatus
        enum CustomLroStates {
          @lroSucceeded Donezo,
          @lroFailed Borked,
          @lroCanceled Chucked,
          HaveAnother,
        }
`)) as { DefaultLroStates: Enum; CustomLroStates: Enum };

      deepStrictEqual(getLongRunningStates(runner.program, DefaultLroStates), {
        succeededState: ["Succeeded"],
        failedState: ["Failed"],
        canceledState: ["Canceled"],
        states: ["Succeeded", "Failed", "Canceled", "Extra"],
      });

      deepStrictEqual(getLongRunningStates(runner.program, CustomLroStates), {
        succeededState: ["Donezo"],
        failedState: ["Borked"],
        canceledState: ["Chucked"],
        states: ["Donezo", "Borked", "Chucked", "HaveAnother"],
      });
    });

    it("returns LRO states from an named union type", async () => {
      const { DefaultLroStates, CustomLroStates } = (await runner.compile(`
        @test
        @lroStatus
        union DefaultLroStates {
          "Succeeded",
          "Failed",
          "Canceled",
          "Extra",
        }

        @test
        @lroStatus
        union CustomLroStates {
          @lroSucceeded "Donezo",
          @lroFailed "Borked",
          @lroCanceled "Chucked",
          "HaveAnother",
        }
      `)) as { DefaultLroStates: Enum; CustomLroStates: Enum };

      deepStrictEqual(getLongRunningStates(runner.program, DefaultLroStates), {
        succeededState: ["Succeeded"],
        failedState: ["Failed"],
        canceledState: ["Canceled"],
        states: ["Succeeded", "Failed", "Canceled", "Extra"],
      });

      deepStrictEqual(getLongRunningStates(runner.program, CustomLroStates), {
        succeededState: ["Donezo"],
        failedState: ["Borked"],
        canceledState: ["Chucked"],
        states: ["Donezo", "Borked", "Chucked", "HaveAnother"],
      });
    });

    it("returns LRO states from an named union type built with enum", async () => {
      const { DefaultLroStates } = (await runner.compile(`
        enum CommonStates {
          Succeeded,
          Failed,
          Canceled
        }

        @test
        @lroStatus
        union DefaultLroStates {
          CommonStates,
          "Extra",
        }
      `)) as { DefaultLroStates: Enum; CustomLroStates: Enum };

      deepStrictEqual(getLongRunningStates(runner.program, DefaultLroStates), {
        succeededState: ["Succeeded"],
        failedState: ["Failed"],
        canceledState: ["Canceled"],
        states: ["Succeeded", "Failed", "Canceled", "Extra"],
      });
    });

    it("returns LRO states from a string type with known values", async () => {
      const { DefaultLroStates, CustomLroStates } = (await runner.compile(`
        @test
        @lroStatus
        enum DefaultLroStates {
          Succeeded,
          Failed,
          Canceled,
          Extra,
        }

        @test
        @lroStatus
        enum CustomLroStates {
          @lroSucceeded Donezo,
          @lroFailed Borked,
          @lroCanceled Chucked,
          HaveAnother,
        }
`)) as { DefaultLroStates: Model; CustomLroStates: Model };

      deepStrictEqual(getLongRunningStates(runner.program, DefaultLroStates), {
        succeededState: ["Succeeded"],
        failedState: ["Failed"],
        canceledState: ["Canceled"],
        states: ["Succeeded", "Failed", "Canceled", "Extra"],
      });

      deepStrictEqual(getLongRunningStates(runner.program, CustomLroStates), {
        succeededState: ["Donezo"],
        failedState: ["Borked"],
        canceledState: ["Chucked"],
        states: ["Donezo", "Borked", "Chucked", "HaveAnother"],
      });
    });

    it("resolve default state from union variant name", async () => {
      const { DefaultLroStates } = (await runner.compile(`
        @test
        @lroStatus
        union DefaultLroStates {
          Succeeded: "uSucceeded",
          Failed: "uFailed",
          Canceled: "uCancelled",
          Extra: "uExtra",
        }
      `)) as { DefaultLroStates: Model };

      deepStrictEqual(getLongRunningStates(runner.program, DefaultLroStates), {
        succeededState: ["Succeeded"],
        failedState: ["Failed"],
        canceledState: ["Canceled"],
        states: ["Succeeded", "Failed", "Canceled", "Extra"],
      });
    });
  });

  describe("@operationLink", () => {
    it("works for sample usage", async () => {
      const code = `
      using TypeSpec.Rest.Resource;
      
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
      using TypeSpec.Rest.Resource;
      
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
      using TypeSpec.Rest.Resource;
      
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
      using TypeSpec.Rest.Resource;
      
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
      using TypeSpec.Rest.Resource;
      
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
      using TypeSpec.Rest.Resource;
      
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
      using TypeSpec.Rest.Resource;
      
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
  describe("@useFinalStateVia", () => {
    it("correctly overrides PUT lro final-state-via", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @useFinalStateVia("operation-location")
      @test @put op foo(): {@header("Operation-Location") loc: string};

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
      `;
      const [{ foo }, diagnostics] = await runner.compileAndDiagnose(code);
      expectDiagnosticEmpty(diagnostics);
      const op = foo as Operation;

      assert.ok(op);
      assert.deepStrictEqual(op.kind, "Operation");
      const finalState = getFinalStateOverride(runner.program, op);
      assert.deepStrictEqual(finalState, FinalStateValue.operationLocation);
    });
    it("emits diagnostic for invalid PUT override", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @useFinalStateVia("operation-location")
      @test @put op foo(): {loc: string};

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/invalid-final-state",
        message:
          "There was no header corresponding to the desired final-state-via value 'operation-location'.",
      });
    });
    it("emits error for missing header", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @useFinalStateVia("location")
      @post op foo(): {};

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/invalid-final-state",
        message: `There was no header corresponding to the desired final-state-via value 'location'.`,
      });
    });
    it("emits error for original-uri on non-PUT request", async () => {
      const code = `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @pollingOperation(bar)
      @useFinalStateVia("original-uri")
      @post op foo(): {};

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is test code."
      @route("/polling")
      @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
      `;
      const diagnostics = await runner.diagnose(code);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-core/invalid-final-state",
        message: "The final state value 'original-uri' can only be used in http PUT operations",
      });
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

  describe("@fixed", () => {
    it("marks `@fixed` enum correctly", async () => {
      const result = await runner.compile(
        `
          @test @fixed enum FixedEnum {
            A,
            B,
            C,
          }
          `,
      );

      ok(isFixed(runner.program, result.FixedEnum as Enum), "Expected fixed enum");
    });
  });

  describe("@parameterizedNextLinkConfig", () => {
    it("single parameter", async () => {
      const { includePending, nextLink } = (await runner.compile(`
        model ListCertificateOptions {
          @test includePending?: string;
        }
        model Certificate {}
        model Page {
          @items items: Certificate[];
          @test @nextLink nextLink: Azure.Core.parameterizedNextLink<[ListCertificateOptions.includePending]>;
        }
`)) as { includePending: ModelProperty; nextLink: ModelProperty };
      assert.strictEqual(nextLink.type.kind, "Scalar");
      const templateArgs = getParameterizedNextLinkArguments(runner.program, nextLink.type);
      assert.strictEqual(templateArgs.length, 1);
      assert.strictEqual(templateArgs[0], includePending);
    });
    it("multiple parameter", async () => {
      const { includePending, includeExpired, nextLink } = (await runner.compile(`
        model ListCertificateOptions {
          @test includePending?: string;
          @test includeExpired?: string;
        }
        model Certificate {}
        model Page {
          @items items: Certificate[];
          @test @nextLink nextLink: Azure.Core.parameterizedNextLink<[
            ListCertificateOptions.includePending,
            ListCertificateOptions.includeExpired
          ]>;
        }
`)) as { includePending: ModelProperty; includeExpired: ModelProperty; nextLink: ModelProperty };
      assert.strictEqual(nextLink.type.kind, "Scalar");
      const templateArgs = getParameterizedNextLinkArguments(runner.program, nextLink.type);
      assert.strictEqual(templateArgs.length, 2);
      assert.strictEqual(templateArgs[0], includePending);
      assert.strictEqual(templateArgs[1], includeExpired);
    });
    it("no parameter", async () => {
      const diagnostics = await runner.diagnose(`
        model Certificate {}
        model Page {
          @items items: Certificate[];
          @test @nextLink nextLink: Azure.Core.parameterizedNextLink;
        }
`);
      expectDiagnostics(diagnostics, {
        code: "invalid-template-args",
        message: "Template argument 'ParameterizedParams' is required and not specified.",
      });
    });
    it("call getParameterizedNextLinkArguments on unrelated type", async () => {
      const { includePending } = (await runner.compile(`
        model ListCertificateOptions {
          @test includePending?: string;
      }
`)) as { includePending: ModelProperty };
      assert.strictEqual(includePending.type.kind, "Scalar");
      assert.ok(!getParameterizedNextLinkArguments(runner.program, includePending.type));
    });
  });
});
