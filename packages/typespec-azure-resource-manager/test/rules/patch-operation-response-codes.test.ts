import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeAll, describe, it } from "vitest";
import { patchOperationResponseCodesRule } from "../../src/rules/patch-operation-response-codes.js";

const code = "@azure-tools/typespec-azure-resource-manager/patch-operation-response-codes";
const responses = `
  model Ok { @statusCode statusCode: 200; @body value: string; }
  model Status {
    @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running";
  }
  model Started {
    @statusCode statusCode: 200;
    @Azure.Core.pollingLocation @header("Operation-Location")
    location: ResourceLocation<Status>;
    @body value: string;
  }
  model AcceptedLro {
    @statusCode statusCode: 202;
    @Azure.Core.pollingLocation @header("Operation-Location")
    location: ResourceLocation<Status>;
  }
  model Accepted { @statusCode statusCode: 202; @header location?: string; }
  model AcceptedWithBody { @statusCode statusCode: 202; @body value: string; }
  model AcceptedWithBodyRange { @statusCode @minValue(202) @maxValue(202) statusCode: int32; @body value: string; }
  model NoContent { @statusCode statusCode: 204; }
`;

function patch(returnType: string, decorators = ""): string {
  return `
    @armProviderNamespace
    namespace Microsoft.Contoso;
    using TypeSpec.OpenAPI;
    ${responses}
    ${decorators}
    @route("/widgets") @patch op update(): ${returnType};
  `;
}

let tester: LinterRuleTester;

beforeAll(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    patchOperationResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
}, 60_000);

describe("synchronous PATCH responses", () => {
  it("reports an empty response set", async () => {
    await tester.expect(patch("Empty", "union Empty {}")).toEmitDiagnostics({
      code,
      message: "PATCH operations must have at least one response.",
    });
  });

  it("accepts exactly 200 and a standard error response", async () => {
    await tester.expect(patch("Ok | ErrorResponse")).toBeValid();
  });

  it.each([
    ["a missing standard error response", "Ok"],
    ["a missing 200", "ErrorResponse"],
    ["an extra response", "Ok | NoContent | ErrorResponse"],
    ["a 202 without an LRO marker", "Ok | Accepted | ErrorResponse"],
  ])("rejects %s", async (_, returnType) => {
    await tester.expect(patch(returnType)).toEmitDiagnostics({
      code,
      message:
        "Synchronous PATCH operations must have only a 200 response and a standard error response.",
    });
  });

  it("accepts a singleton response status range as its literal code", async () => {
    await tester
      .expect(
        patch(
          "Range | ErrorResponse",
          "model Range { @statusCode @minValue(200) @maxValue(200) code: int32; }",
        ),
      )
      .toBeValid();
  });

  it("rejects a response status range", async () => {
    await tester
      .expect(
        patch(
          "Range | ErrorResponse",
          "model Range { @statusCode @minValue(200) @maxValue(299) code: int32; }",
        ),
      )
      .toEmitDiagnostics({
        code,
        message:
          "Synchronous PATCH operations must have only a 200 response and a standard error response.",
      });
  });
});

describe("long-running PATCH responses", () => {
  it("accepts exactly 200, 202 without a body, and a standard error response", async () => {
    await tester.expect(patch("Started | Accepted | ErrorResponse")).toBeValid();
  });

  it.each([
    ["a missing 202 with native polling metadata", "Started | ErrorResponse"],
    ["a missing 200", "AcceptedLro | ErrorResponse"],
    ["a missing standard error response", "Started | Accepted"],
    ["an extra response", "Started | Accepted | NoContent | ErrorResponse"],
  ])("rejects %s with one response-set warning", async (_, returnType) => {
    await tester.expect(patch(returnType)).toEmitDiagnostics({
      code,
      message:
        "Long-running PATCH operations must have only 200, 202, and a standard error response.",
    });
  });

  it("rejects a 202 body independently of the response set", async () => {
    await tester.expect(patch("Started | AcceptedWithBody | ErrorResponse")).toEmitDiagnostics({
      code,
      message: "The 202 response of a long-running PATCH operation must not have a body.",
    });
  });

  it("rejects a 202 body declared with a singleton status range", async () => {
    await tester
      .expect(patch("Started | AcceptedWithBodyRange | ErrorResponse"))
      .toEmitDiagnostics({
        code,
        message: "The 202 response of a long-running PATCH operation must not have a body.",
      });
  });

  it("rejects a body in one of multiple 202 response variants", async () => {
    await tester
      .expect(patch("Started | Accepted | AcceptedWithBody | ErrorResponse"))
      .toEmitDiagnostics({
        code,
        message: "The 202 response of a long-running PATCH operation must not have a body.",
      });
  });

  it("rejects a body shared by 200 and 202 status codes", async () => {
    await tester
      .expect(
        patch(
          "Started | Both | ErrorResponse",
          `model Both {
            @statusCode code: 200 | 202;
            @Azure.Core.pollingLocation @header("Operation-Location")
            location: ResourceLocation<Status>;
            @body value: string;
          }`,
        ),
      )
      .toEmitDiagnostics({
        code,
        message: "The 202 response of a long-running PATCH operation must not have a body.",
      });
  });

  it("reports both an invalid response set and a 202 body", async () => {
    await tester
      .expect(patch("Started | AcceptedWithBody | NoContent | ErrorResponse"))
      .toEmitDiagnostics([
        {
          code,
          message:
            "Long-running PATCH operations must have only 200, 202, and a standard error response.",
        },
        {
          code,
          message: "The 202 response of a long-running PATCH operation must not have a body.",
        },
      ]);
  });
});

describe("operation and service scope", () => {
  it("checks custom operations in a nested ARM namespace", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Contoso {
          namespace Nested {
            @route("/widgets") @patch op update(): { @statusCode code: 204; };
          }
        }
      `,
      )
      .toEmitDiagnostics({
        code,
        message:
          "Synchronous PATCH operations must have only a 200 response and a standard error response.",
      });
  });

  it("ignores other HTTP methods and non-ARM services", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Contoso {
          @route("/widgets") @get op read(): { @statusCode code: 204; };
        }
        @service namespace DataPlane {
          @route("/widgets") @patch op update(): { @statusCode code: 204; };
        }
      `,
      )
      .toBeValid();
  });

  it("checks an overload that inherits its PATCH method", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Contoso;
        model Ok { @statusCode code: 200; @body value: string; }
        @route("/widgets") @patch
        op original(@body input: string | int32): Ok | ErrorResponse;
        @overload(original)
        op specialized(@body input: string): Ok;
      `,
      )
      .toEmitDiagnostics({
        code,
        message:
          "Synchronous PATCH operations must have only a 200 response and a standard error response.",
      });
  });

  it.each(["ArmCustomPatchSync", "ArmCustomPatchAsync"])(
    "accepts the standard %s template",
    async (template) => {
      await tester
        .expect(
          `
          @armProviderNamespace namespace Microsoft.Contoso;
          model Employee is ProxyResource<{}> {
            ...ResourceNameParameter<Employee>;
          }
          @armResourceOperations interface Employees {
            update is ${template}<Employee>;
          }
        `,
        )
        .toBeValid();
    },
  );

  it.each([
    [
      "synchronous",
      "ArmCustomPatchSync<Employee, Response = ArmResponse<Employee> | NoContent>",
      "Synchronous PATCH operations must have only a 200 response and a standard error response.",
    ],
    [
      "long-running",
      'ArmCustomPatchAsync<Employee, Response = ArmAcceptedLroResponse<"Accepted", ArmLroLocationHeader<FinalResult = Employee>>>',
      "Long-running PATCH operations must have only 200, 202, and a standard error response.",
    ],
  ])("reports an invalid %s ARM resource update", async (_, operation, message) => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Contoso;
        model Employee is ProxyResource<{}> {
          ...ResourceNameParameter<Employee>;
        }
        model NoContent { @statusCode code: 204; }
        @armResourceOperations interface Employees {
          update is ${operation};
        }
      `,
      )
      .toEmitDiagnostics({ code, message });
  });
});
