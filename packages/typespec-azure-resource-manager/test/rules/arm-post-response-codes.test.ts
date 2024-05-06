import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armPostResponseCodesRule } from "../../src/rules/arm-post-response-codes.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    armPostResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("Emits a warning for a synchronous post operation that does not contain the appropriate response codes", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      
      @armResourceOperations
      interface Employees {
        @post
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 203;
          result: boolean;
        } | ErrorResponse;
      }
      `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes",
      message:
        "Synchronous post operations must have a 200 or 204 response and a default response. They must not have any other responses.",
    });
});

it("Does not emit a warning for a synchronous post operation that contains the 200 and default response codes", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      
      @armResourceOperations
      interface Employees {
        @post
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        } | ErrorResponse;
      }
    `
    )
    .toBeValid();
});

it("Does not emit a warning for a synchronous post operation that contains 204 and default response codes", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      
      @armResourceOperations
      interface Employees {
        @post
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 204;
          result: boolean;
        } | ErrorResponse;
      }
    `
    )
    .toBeValid();
});

it("Does not emit a warning for a long-running post operation that satisfies the requirements.", async () => {
  await tester
    .expect(
      `
      using Azure.Core;

      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      
      @armResourceOperations
      interface Widgets {
        @get getWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;
      
        @get getStatus(...KeysOf<Widget>, @path @segment("statuses") statusId: string): PollingStatus | ErrorResponse;
      
        @pollingOperation(Widgets.getStatus, {widgetName: RequestParameter<"name">, statusId: ResponseProperty<"operationId">})
        @finalOperation(Widgets.getWidget, {widgetName: RequestParameter<"name">})
        @armResourceAction(Widget)
        @post create(...KeysOf<Widget>, @bodyRoot body: Widget): {
          @statusCode code: "202";
          @header("x-ms-operation-id") operationId: string;
        } | {
          @statusCode code: "200";
          @header("x-ms-operation-id") operationId: string;
          @body result: Widget;
        } | ErrorResponse;
      }`
    )
    .toBeValid();
});

it("Emits a warning for a long-running post operation that has a 202 response with a schema.", async () => {
  await tester
    .expect(
      `
      using Azure.Core;

      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      
      @armResourceOperations
      interface Widgets {
        @get getWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;
      
        @get getStatus(...KeysOf<Widget>, @path @segment("statuses") statusId: string): PollingStatus | ErrorResponse;
      
        @pollingOperation(Widgets.getStatus, {widgetName: RequestParameter<"name">, statusId: ResponseProperty<"operationId">})
        @finalOperation(Widgets.getWidget, {widgetName: RequestParameter<"name">})
        @armResourceAction(Widget)
        @post create(...KeysOf<Widget>, @bodyRoot body: Widget): {
          @statusCode code: "202";
          @header("x-ms-operation-id") operationId: string;
          @bodyRoot body: Widget;
        } | ErrorResponse;
      }`
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes",
      message:
        "Long-running post operations must have 202 and default responses. They must also have a 200 response if the final response has a schema. They must not have any other responses.",
    });
});

it("Emits a warning for a long-running post operation that has a 200 response with no schema.", async () => {
  await tester
    .expect(
      `
      using Azure.Core;

      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      
      @armResourceOperations
      interface Widgets {
        @get getWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;
      
        @get getStatus(...KeysOf<Widget>, @path @segment("statuses") statusId: string): PollingStatus | ErrorResponse;
      
        @pollingOperation(Widgets.getStatus, {widgetName: RequestParameter<"name">, statusId: ResponseProperty<"operationId">})
        @finalOperation(Widgets.getWidget, {widgetName: RequestParameter<"name">})
        @armResourceAction(Widget)
        @post create(...KeysOf<Widget>, @bodyRoot body: Widget): {
          @statusCode code: "202";
          @header("x-ms-operation-id") operationId: string;
        } | {
          @statusCode code: "200";
          @header("x-ms-operation-id") operationId: string;
        } | ErrorResponse;
      }`
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes",
      message:
        "Long-running post operations must have 202 and default responses. They must also have a 200 response if the final response has a schema. They must not have any other responses.",
    });
});

it("Emits a warning for a long-running post operation that has invalid response codes.", async () => {
  await tester
    .expect(
      `
      using Azure.Core;

      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      
      @armResourceOperations
      interface Widgets {
        @get getWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;
      
        @get getStatus(...KeysOf<Widget>, @path @segment("statuses") statusId: string): PollingStatus | ErrorResponse;
      
        @pollingOperation(Widgets.getStatus, {widgetName: RequestParameter<"name">, statusId: ResponseProperty<"operationId">})
        @finalOperation(Widgets.getWidget, {widgetName: RequestParameter<"name">})
        @armResourceAction(Widget)
        @post create(...KeysOf<Widget>, @bodyRoot body: Widget): {
          @statusCode code: "203";
          @header("x-ms-operation-id") operationId: string
        } | ErrorResponse;
      }`
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes",
      message:
        "Long-running post operations must have 202 and default responses. They must also have a 200 response if the final response has a schema. They must not have any other responses.",
    });
});
