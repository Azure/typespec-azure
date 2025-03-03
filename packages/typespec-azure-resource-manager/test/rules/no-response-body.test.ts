import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noResponseBodyRule } from "../../src/rules/no-response-body.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: no response body rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      noResponseBodyRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("is valid if 202 responses have no body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 202;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toBeValid();
  });

  it("is valid if 204 responses have no body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 204;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toBeValid();
  });

  it("emit warnings if a 204 response has a body", async () => {
    await tester
      .expect(
        `
        op walk(): ArmNoContentResponse & {
          @body body: string;
        };
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of 204 response should be empty.`,
      });
  });

  it("emit warnings if a 202 response has a body", async () => {
    await tester
      .expect(
        `
        model TestAcceptedResponse {
          @statusCode statusCode: 202;
          @bodyRoot body: string;
        }
        op walk(): TestAcceptedResponse;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of 202 response should be empty.`,
      });
  });

  it("emit warnings if 201 responses have no body", async () => {
    await tester
      .expect(
        `
        op walk(): CreatedResponse;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of responses with success (2xx) status codes other than 202 and 204 should not be empty.`,
      });
  });

  it("valid if a 2xx response has no body for head", async () => {
    await tester
      .expect(
        `
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          @armProviderNamespace
          namespace Microsoft.Foo;
          
          model Employee is TrackedResource<{}> {
          @key("employeeName") @segment("employeeName") @path
            name: string;
           }
           
          @armResourceOperations
          interface TestingOperations {
            checkExistence is ArmResourceCheckExistence<Employee>;
          }
        `,
      )
      .toBeValid();
  });

  it("valid if a 2xx response has no body for delete", async () => {
    await tester
      .expect(
        `
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          @armProviderNamespace
          namespace Microsoft.Foo;
          
          model Employee is TrackedResource<{}> {
            @key("employeeName")
            @segment("employeeName")
            @path
            name: string;
          }
          
          @armResourceOperations
          interface TestingOperations {
            delete is ArmResourceDeleteSync<Employee>;
          }
        `,
      )
      .toBeValid();
  });

  it("valid if a 2xx response has no body for post", async () => {
    await tester
      .expect(
        `
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          @armProviderNamespace
          namespace Microsoft.Foo;
          
          @armResourceOperations
          interface TestingOperations {
            postEmployees is ArmProviderActionAsync<Response = void>;
          }
        `,
      )
      .toBeValid();
  });

  it("allows templates but emit on use of the template ", async () => {
    await tester
      .expect(
        `
          @armProviderNamespace
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          namespace Microsoft.ContosoProviderHub;

          op SampleTemplate<
            Resource extends Foundations.Resource,
            Response extends {} = ArmResponse<Resource>
          > is ArmCustomPatchAsync<Resource, Response = Response>;

          model Image is Azure.ResourceManager.TrackedResource<{name: string}> {
            ...ResourceNameParameter<
              Resource = Image
            >;
          }

          @armResourceOperations
          interface Images {
            @patch(#{ implicitOptionality: false })
            update is SampleTemplate<
              Image,
              Response =  (ArmAcceptedLroResponse<LroHeaders = Azure.Core.Foundations.RetryAfterHeader &
                ArmLroLocationHeader<FinalResult = Image>> & {
                @body _: Image;
              })
            >;
          }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: `The body of 202 response should be empty.`,
      });
  });
});
