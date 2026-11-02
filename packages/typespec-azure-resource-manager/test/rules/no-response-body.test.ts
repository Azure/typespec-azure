import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { noResponseBodyRule } from "../../src/rules/no-response-body.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
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
                  @armProviderNamespace
          namespace Microsoft.Foo;
          
          model Employee is TrackedResource<{}> {
          ...ResourceNameParameter<Employee>;
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

describe("DELETE response bodies", () => {
  it("rejects a body-bearing 200 response on a standard synchronous delete", async () => {
    await tester
      .expect(
        `
          @armProviderNamespace
          namespace Microsoft.Contoso;

          model Widget is ProxyResource<{}> {
            ...ResourceNameParameter<Widget>;
          }

          @armResourceOperations
          interface Widgets {
            /*target*/delete is ArmResourceDeleteSync<
              Widget,
              Response = (ArmDeletedResponse & { @body body: string; }) | ArmDeletedNoContentResponse
            >;
          }
        `,
      )
      .toEmitDiagnostics((result) => ({
        code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
        message: "The body of 200 response for DELETE should be empty.",
        pos: result.pos.target.pos,
      }));
  });

  it.each(["@body body: string;", "@bodyRoot body: { value: string };", "value: string;"])(
    "rejects a DELETE 200 payload declared with %s",
    async (body) => {
      await tester
        .expect(
          `
            /*target*/@delete op remove(): {
              @statusCode statusCode: 200;
              ${body}
            };
          `,
        )
        .toEmitDiagnostics((result) => ({
          code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
          message: "The body of 200 response for DELETE should be empty.",
          pos: result.pos.target.pos,
        }));
    },
  );

  it("reports once per violating DELETE status", async () => {
    await tester
      .expect(
        `
          /*target*/@delete op remove():
            | { @statusCode statusCode: 200; @body body: string; }
            | { @statusCode statusCode: 200; @body body: int32; }
            | { @statusCode statusCode: 204; @bodyRoot body: string; };
        `,
      )
      .toEmitDiagnostics((result) => [
        {
          code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
          message: "The body of 200 response for DELETE should be empty.",
          pos: result.pos.target.pos,
        },
        {
          code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
          message: "The body of 204 response should be empty.",
          pos: result.pos.target.pos,
        },
      ]);
  });

  it("accepts standard asynchronous delete and header-only responses", async () => {
    await tester
      .expect(
        `
          @armProviderNamespace
          namespace Microsoft.Contoso;

          model Widget is ProxyResource<{}> {
            ...ResourceNameParameter<Widget>;
          }

          @armResourceOperations
          interface Widgets {
            delete is ArmResourceDeleteWithoutOkAsync<Widget>;
          }

          @route("/header-only") @delete op remove():
            | { @statusCode statusCode: 200; @header etag: string; }
            | { @statusCode statusCode: 204; @header etag: string; };
        `,
      )
      .toBeValid();
  });
});

it.each([
  ["delete", 202],
  ["delete", 204],
  ["post", 202],
  ["post", 204],
])("checks %s bodies for status %s after a bodyless 200 response", async (verb, status) => {
  await tester
    .expect(
      `
        /*target*/@${verb} op remove():
          | { @statusCode statusCode: 200; }
          | { @statusCode statusCode: ${status}; @body body: string; };
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/no-response-body",
      message: `The body of ${status} response should be empty.`,
      pos: result.pos.target.pos,
    }));
});

it.each(["get", "post", "put"])("accepts non-DELETE 200 response bodies for %s", async (verb) => {
  await tester.expect(`@${verb} op read(): { @body body: string; };`).toBeValid();
});
