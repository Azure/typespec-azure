import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeAll, describe, it } from "vitest";
import { armPatchResponseCodesRule } from "../../src/rules/arm-patch-response-codes.js";

const code = "@azure-tools/typespec-azure-resource-manager/arm-patch-operation-response-codes";
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
    armPatchResponseCodesRule,
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

  it("accepts exactly 200 and default", async () => {
    await tester.expect(patch("Ok | ErrorResponse")).toBeValid();
  });

  it.each([
    ["a missing default", "Ok"],
    ["a missing 200", "ErrorResponse"],
    ["an extra response", "Ok | NoContent | ErrorResponse"],
    ["a 202 without an LRO marker", "Ok | Accepted | ErrorResponse"],
  ])("rejects %s", async (_, returnType) => {
    await tester.expect(patch(returnType)).toEmitDiagnostics({
      code,
      message: "Synchronous PATCH operations must have only 200 and default responses.",
    });
  });

  it.each([200, 299])("rejects a status range ending at %i", async (end) => {
    await tester
      .expect(
        patch(
          "Range | ErrorResponse",
          `model Range { @statusCode @minValue(200) @maxValue(${end}) code: int32; }`,
        ),
      )
      .toEmitDiagnostics({
        code,
        message: "Synchronous PATCH operations must have only 200 and default responses.",
      });
  });
});

describe("long-running PATCH responses", () => {
  it("accepts exactly 200, 202 without a body, and default", async () => {
    await tester.expect(patch("Started | Accepted | ErrorResponse")).toBeValid();
  });

  it.each([
    ["a missing 202", "Started | ErrorResponse"],
    ["a missing 200", "AcceptedLro | ErrorResponse"],
    ["a missing default", "Started | Accepted"],
    ["an extra response", "Started | Accepted | NoContent | ErrorResponse"],
  ])("rejects %s with one response-set warning", async (_, returnType) => {
    await tester.expect(patch(returnType)).toEmitDiagnostics({
      code,
      message: "Long-running PATCH operations must have only 200, 202, and default responses.",
    });
  });

  it("rejects a 202 body independently of the response set", async () => {
    await tester.expect(patch("Started | AcceptedWithBody | ErrorResponse")).toEmitDiagnostics({
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
          message: "Long-running PATCH operations must have only 200, 202, and default responses.",
        },
        {
          code,
          message: "The 202 response of a long-running PATCH operation must not have a body.",
        },
      ]);
  });
});

describe("explicit OpenAPI LRO extensions", () => {
  it("does not treat an explicit flag alone as LRO metadata", async () => {
    await tester
      .expect(patch("Ok | ErrorResponse", '@extension("x-ms-long-running-operation", true)'))
      .toBeValid();
  });

  it("uses synchronous response rules when only an explicit flag is present", async () => {
    await tester
      .expect(
        patch("Ok | Accepted | ErrorResponse", '@extension("x-ms-long-running-operation", true)'),
      )
      .toEmitDiagnostics({
        code,
        message: "Synchronous PATCH operations must have only 200 and default responses.",
      });
  });

  it("uses semantic polling metadata when there is no explicit marker", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Contoso;
        model Status {
          @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running";
        }
        model Started {
          @statusCode code: 200;
          @Azure.Core.pollingLocation @header("Operation-Location")
          location: ResourceLocation<Status>;
          @body value: string;
        }
        @route("/widgets") @patch op update(): Started | ErrorResponse;
      `,
      )
      .toEmitDiagnostics({
        code,
        message: "Long-running PATCH operations must have only 200, 202, and default responses.",
      });
  });

  it("uses LRO metadata even when an explicit flag is false", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace Microsoft.Contoso;
        using TypeSpec.OpenAPI;
        model Employee is ProxyResource<{}> {
          ...ResourceNameParameter<Employee>;
        }
        @armResourceOperations interface Employees {
          @extension("x-ms-long-running-operation", false)
          update is ArmCustomPatchAsync<Employee>;
        }
      `,
      )
      .toBeValid();
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
        message: "Synchronous PATCH operations must have only 200 and default responses.",
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
        message: "Synchronous PATCH operations must have only 200 and default responses.",
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
});
