import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armPostResponseCodesRule } from "../../src/rules/arm-post-response-codes.js";
import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

describe.each([armPostResponseCodesRule, useStandardResponseCodesRule])("$name", (rule) => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;
  const syncMessage =
    rule === armPostResponseCodesRule
      ? armPostResponseCodesRule.messages.sync
      : useStandardResponseCodesRule.messages.postSync;
  const asyncMessage =
    rule === armPostResponseCodesRule
      ? armPostResponseCodesRule.messages.async
      : useStandardResponseCodesRule.messages.postAsync;

  beforeEach(async () => {
    runner = await Tester.createInstance();
    tester = createLinterRuleTester(runner, rule, "@azure-tools/typespec-azure-resource-manager");
  });

  it("Emits a warning for a synchronous post operation that does not contain the appropriate response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
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
      `,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message: syncMessage,
      });
  });

  it("Emits a warning for a synchronous post operation that does not contain the appropriate response codes and use multipart/mixed", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      
      @armResourceOperations
      interface Employees {
        @post
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 203;
          @header contentType: "multipart/mixed";
          @multipartBody result: [HttpPart<string>]
        } | ErrorResponse;
      }
      `,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message: syncMessage,
      });
  });

  it("Does not emit a warning for a synchronous post operation that contains the 200 and default response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
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
    `,
      )
      .toBeValid();
  });

  it("Does not emit a warning for a synchronous post operation that contains 204 and default response codes", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
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
    `,
      )
      .toBeValid();
  });

  it("Does not emit a warning for a long-running post operation that satisfies the requirements.", async () => {
    await tester
      .expect(
        `
      using Azure.Core;

      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
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
      }`,
      )
      .toBeValid();
  });

  it("accepts a long-running action without a 200 response", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Contoso;
        model Employee is ProxyResource<{}> {
          ...ResourceNameParameter<Employee>;
        }
        @armResourceOperations
        interface Employees {
          hire is ArmResourceActionNoResponseContentAsync<Employee, void>;
        }
      `,
      )
      .toBeValid();
  });

  it("leaves missing default responses to the error response rule only in the combined rule", async () => {
    const result = tester.expect(
      `
        @armProviderNamespace
        namespace Microsoft.Contoso;
        model Employee is ProxyResource<{}> {
          ...ResourceNameParameter<Employee>;
        }
        @armResourceOperations
        interface Employees {
          @post @armResourceAction(Employee)
          hire(...ApiVersionParameter): { @statusCode code: 200; @body body: Employee; };
        }
      `,
    );
    if (rule === useStandardResponseCodesRule) {
      await result.toBeValid();
    } else {
      await result.toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message:
          "Synchronous post operations must have a 200 or 204 response and a default response. They must not have any other responses.",
        target: "hire",
      });
    }
  });

  it("Emits a warning for a long-running post operation that has a 202 response with a schema.", async () => {
    await tester
      .expect(
        `
      using Azure.Core;

      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
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
      }`,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message: asyncMessage,
      });
  });

  it("Emits a warning for a long-running post operation that has a 200 response with no schema.", async () => {
    await tester
      .expect(
        `
      using Azure.Core;

      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
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
      }`,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message: asyncMessage,
      });
  });

  it("Emits a warning for a long-running post operation that has invalid response codes.", async () => {
    await tester
      .expect(
        `
      using Azure.Core;

      @armProviderNamespace
      namespace Microsoft.Contoso;
      
      model PollingStatus {
        @Azure.Core.lroStatus
        statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
      }
            
      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
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
      }`,
      )
      .toEmitDiagnostics({
        code: `@azure-tools/typespec-azure-resource-manager/${rule.name}`,
        message: asyncMessage,
      });
  });
});
