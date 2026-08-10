import { Tester, TesterWithService } from "#test/test-host.js";
import { expectDiagnosticEmpty, expectDiagnostics, t } from "@typespec/compiler/testing";
import { ok } from "assert";
import { expect, it } from "vitest";
import { getOperationLinks } from "./operation-link.js";

it("works for sample usage", async () => {
  const { Foo, program } = await TesterWithService.compile(t.code`
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
    
    @autoRoute
    interface ${t.interface("Foo")} {
      @get read is Azure.Core.StandardResourceOperations.ResourceRead<MyResource>;

      @get status(...KeysOf<MyResource>, @path @segment("statuses") statusId: string) : ResourceStatus | Foundations.ErrorResponse;

      @pollingOperation(Foo.status, {resourceName: RequestParameter<"name">, statusId: ResponseProperty<"operationId">})
      @finalOperation(Foo.read, {resourceName: RequestParameter<"name">})
      @put createOrUpdate(...KeysOf<MyResource>, @body body: MyResource) : LroResponseWithCompletion<MyResource> | Foundations.ErrorResponse;
    }
  `);

  const result = getOperationLinks(program, Foo.operations.get("createOrUpdate")!);
  ok(result);
  expect(result.get("final")).toBeDefined();
  expect(result.get("polling")).toBeDefined();
});

it("raises diagnostic if RequestParameter or ResponseProperty are not used", async () => {
  const diagnostics = await Tester.diagnose(`
    model FooBody {
      id: string;
    }

    model FooResult {
      resultId: string;
    }

    interface Foo {
      @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

      @pollingOperation(Foo.bar, {poll: string})
      @put foo(@body body: FooBody): FooResult;
    }
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/operation-link-parameter-invalid",
    message: "Parameters must be of template type RequestParameter<T> or ResponseProperty<T>.",
  });
});

it("raises diagnostic if parameter does not exist on linked operation", async () => {
  const diagnostics = await Tester.diagnose(`
    model FooBody {
      id: string;
    }

    model FooResult {
      resultId: string;
    }

    interface Foo {
      @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

      @pollingOperation(Foo.bar, {poll: RequestParameter<"resourceName">})
      @put foo(@body body: FooBody): FooResult;
    }
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/operation-link-parameter-invalid-target",
    message: "Request parameter 'poll' not found in linked operation.",
  });
});

it("raises diagnostic if requestParameter does not exist", async () => {
  const diagnostics = await Tester.diagnose(`
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
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/request-parameter-invalid",
    message: "Request parameter 'resourceName' not found on request body model.",
  });
});

it("passes if requestParameter exists", async () => {
  const diagnostics = await Tester.diagnose(`
    model FooBody {
      id: string;
    }

    model FooResult {
      resultId: string;
    }

    @test
    interface Foo {
      @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

      @pollingOperation(Foo.bar, {statusId: RequestParameter<"id">})
      @put foo(@body body: FooBody): FooResult;
    }
  `);
  expectDiagnosticEmpty(diagnostics);
});

it("raises diagnostic if responseProperty does not exist", async () => {
  const diagnostics = await Tester.diagnose(`
    model FooBody {
      id: string;
    }

    model FooResult {
      @statusCode code: 202;
      resultId: string;
    }

    interface Foo {
      @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};

      @pollingOperation(Foo.bar, {statusId: ResponseProperty<"poll">})
      @put foo(@body body: FooBody): FooResult | Foundations.ErrorResponse;
    }
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/response-property-invalid",
    message: "Response property 'poll' not found on success response model.",
  });
});

it("passes if responseProperty exists", async () => {
  const diagnostics = await Tester.diagnose(`
    model FooBody {
      id: string;
    }

    model FooResult {
      @statusCode code: 202;
      resultId: string;
    }

    interface Foo {
      @get bar(statusId: string) : {status: "Succeeded" | "Failed" | "Canceled"};
      @pollingOperation(Foo.bar, {statusId: ResponseProperty<"resultId">})
      @put foo(@body body: FooBody): FooResult | Foundations.ErrorResponse;
    }
  `);
  expectDiagnosticEmpty(diagnostics);
});
