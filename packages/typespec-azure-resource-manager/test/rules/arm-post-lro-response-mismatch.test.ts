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

const employeeResource = `
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
`;

const preamble = `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      ${employeeResource}
`;

describe("emits warning when 200 response body does not match finalResult", () => {
  it("when LroHeaders override sets void FinalResult but Response is non-void Model", async () => {
    await tester
      .expect(
        `
      ${preamble}

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
        message: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
      });
  });

  it("when LroHeaders set FinalResult to a type that does not match the 200 body", async () => {
    await tester
      .expect(
        `
      ${preamble}

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
        message: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
      });
  });

  it("when LroHeaders are overridden with ArmAsyncOperationHeader & ArmLroLocationHeader and Response is non-void but FinalResult is void", async () => {
    await tester
      .expect(
        `
      ${preamble}

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
        message: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
      });
  });
});

describe("emits warning when 204 response has non-void finalResult", () => {
  it("when ArmResourceActionNoContentAsync has LroHeaders with non-void FinalResult", async () => {
    await tester
      .expect(
        `
      ${preamble}

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        restart is ArmResourceActionNoContentAsync<
          Employee,
          void,
          LroHeaders = ArmLroLocationHeader<FinalResult = GenerateResponse>
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
        message: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
      });
  });
});

describe("emits warning for ArmResourceActionAsyncBase with 200 response body mismatch", () => {
  it("when ArmResourceActionAsyncBase produces 200 with Model body but void finalResult", async () => {
    await tester
      .expect(
        `
      ${preamble}

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsyncBase<
          Employee,
          void,
          ArmAcceptedLroResponse | ArmResponse<GenerateResponse>,
          Azure.ResourceManager.Foundations.DefaultBaseParameters<Employee>
        >;
      }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch",
        message: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
      });
  });
});

describe("emits warning for 202-only ActionAsync template when finalResult mismatches", () => {
  it("when ActionAsync has LroHeaders overridden and finalResult does not match Response parameter", async () => {
    await tester
      .expect(
        `
      ${preamble}

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
        message: `The final result type of a long-running POST operation does not match the response. Specify the FinalResult in the LroHeaders parameter to match the response type. For example: 'LroHeaders = ArmLroLocationHeader<FinalResult = ResponseType>'.`,
      });
  });
});

describe("does not emit warning", () => {
  it("when LroHeaders explicitly sets FinalResult to match 200 body", async () => {
    await tester
      .expect(
        `
      ${preamble}

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

  it("when using ArmResourceActionNoResponseContentAsync (void response, 204)", async () => {
    await tester
      .expect(
        `
      ${preamble}

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
      ${preamble}

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
      ${preamble}

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

  it("when both Response and FinalResult are void (ArmResourceActionNoResponseContentAsync with custom LroHeaders)", async () => {
    await tester
      .expect(
        `
      ${preamble}

      @armResourceOperations
      interface Employees {
        restart is ArmResourceActionNoResponseContentAsync<
          Employee,
          void,
          LroHeaders = ArmLroLocationHeader<
            Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
            void,
            string
          > & Azure.Core.Foundations.RetryAfterHeader
        >;
      }
      `,
      )
      .toBeValid();
  });

  it("when ArmResourceActionAsync has default LroHeaders (200 body matches default FinalResult)", async () => {
    await tester
      .expect(
        `
      ${preamble}

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

  it("when ArmResourceActionNoContentAsync has 204 response and void finalResult", async () => {
    await tester
      .expect(
        `
      ${preamble}

      @armResourceOperations
      interface Employees {
        restart is ArmResourceActionNoContentAsync<Employee, void>;
      }
      `,
      )
      .toBeValid();
  });

  it("when using ArmResourceActionAsyncBase with 202-only response", async () => {
    await tester
      .expect(
        `
      ${preamble}

      @armResourceOperations
      interface Employees {
        generate is ArmResourceActionAsyncBase<
          Employee,
          void,
          ArmAcceptedLroResponse,
          Azure.ResourceManager.Foundations.DefaultBaseParameters<Employee>
        >;
      }
      `,
      )
      .toBeValid();
  });

  it("when a low-level LRO POST has a 200 response with a body and ArmAcceptedLroResponse (not discovered by resolveArmResources)", async () => {
    // Note: Raw @armResourceAction operations are not discovered in resource.operations.actions
    // by resolveArmResources(), so this pattern is not checked by the rule.
    await tester
      .expect(
        `
      ${preamble}

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        @post
        @armResourceAction(Employee)
        generate(...ApiVersionParameter): GenerateResponse | ArmAcceptedLroResponse | ErrorResponse;
      }
      `,
      )
      .toBeValid();
  });

  it("when a low-level LRO POST has a 204 response and ArmAcceptedLroResponse (void finalResult)", async () => {
    await tester
      .expect(
        `
      ${preamble}

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        @post
        @armResourceAction(Employee)
        restart(...ApiVersionParameter): {
          @statusCode _: 204;
        } | ArmAcceptedLroResponse | ErrorResponse;
      }
      `,
      )
      .toBeValid();
  });

  it("when ArmProviderActionAsync with default LroHeaders (200 body matches)", async () => {
    await tester
      .expect(
        `
      ${preamble}

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        generate is ArmProviderActionAsync<
          void,
          GenerateResponse,
          SubscriptionActionScope
        >;
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
        ...ResourceNameParameter<Employee>;
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
        ...ResourceNameParameter<Employee>;
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

  it("replaces ArmLroLocationHeader within an intersection in LroHeaders", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
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
      .applyCodeFix("arm-post-lro-set-final-result")
      .toEqual(
        `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
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
          LroHeaders = ArmAsyncOperationHeader & ArmLroLocationHeader<FinalResult = GenerateResponse>
        >;
      }
      `,
      );
  });
});
