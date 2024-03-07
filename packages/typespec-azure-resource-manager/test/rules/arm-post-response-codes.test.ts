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

it("Emits a warning for a long-running post operation that does not contain the appropriate response codes", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;

        @post
        @pollingOperation(Widgets.getStatus)
        @armResourceAction(Widget)
        longRunning(...ApiVersionParameter): Widget | {
          @statusCode statusCode: 201;
          @header id: string,
          @header("operation-id") operate: string,
          @finalLocation @header("Location") location: ResourceLocation<Widget>,
          @pollingLocation @header("Operation-Location") opLink: string,
          @lroResult @body body?: Widget
        }
      }`
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes",
      message:
        "Long-running post operations must have 202 and default responses. They must also have a 200 response if the final response has a schema. They must not have any other responses.",
    });
});
