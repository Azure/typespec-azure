import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { armPostLroResponseMismatchRule } from "../../src/rules/arm-post-lro-response-mismatch.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armPostLroResponseMismatchRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("emits warning", () => {
  it("when LroHeaders are overridden with ArmLroLocationHeader and Response is non-void but FinalResult is void", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmLroLocationHeader
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
      });
  });

  it("when LroHeaders are overridden with ArmAsyncOperationHeader & ArmLroLocationHeader and Response is non-void but FinalResult is void", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmAsyncOperationHeader & ArmLroLocationHeader
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
      });
  });

  it("when ActionAsync has LroHeaders overridden and finalResult does not match Response parameter", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmLroLocationHeader
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
      });
  });

  it("when ArmProviderActionAsync has LroHeaders overridden and finalResult does not match Response parameter", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmProviderActionAsync<
          void,
          GenerateResponse,
          SubscriptionActionScope,
          LroHeaders = ArmLroLocationHeader
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
      });
  });

  it("when LroHeaders set FinalResult to a type that does not match the Response parameter", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      model OtherResponse {
        value: int32;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmLroLocationHeader<FinalResult = OtherResponse>
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
      });
  });
});

describe("does not emit warning", () => {
  it("when using default LroHeaders (FinalResult matches Response)", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<Employee, void, GenerateResponse>;
      }
      `,
      )
      .toBeValid();
  });

  it("when LroHeaders explicitly sets FinalResult to match Response", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmLroLocationHeader<
            Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
            GenerateResponse
          >
        >;
      }
      `,
      )
      .toBeValid();
  });

  it("when using ArmResourceActionNoResponseContentAsync (void response)", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
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
        restart is ArmResourceActionNoResponseContentAsync<Employee, void>;
      }
      `,
      )
      .toBeValid();
  });

  it("when the operation is not LRO (sync post)", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
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
      `,
      )
      .toBeValid();
  });

  it("when ActionAsync uses default LroHeaders (FinalResult matches Response)", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ActionAsync<Employee, void, GenerateResponse>;
      }
      `,
      )
      .toBeValid();
  });
});

describe("codefix", () => {
  it("suggests setting FinalResult in LroHeaders to match Response type", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmLroLocationHeader
        >;
      }
      `,
      )
      .applyCodeFix("arm-post-lro-set-final-result")
      .toEqual(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsync<
          Employee,
          void,
          GenerateResponse,
          LroHeaders = ArmLroLocationHeader<FinalResult = GenerateResponse>
        >;
      }
      `,
      );
  });
});
