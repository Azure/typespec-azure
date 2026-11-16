import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { armPatchResponseCodesRule } from "../../src/rules/arm-patch-response-codes.js";

const code = "@azure-tools/typespec-azure-resource-manager/arm-patch-operation-response-codes";
const responses = `
  model Ok { @statusCode statusCode: 200; @body value: string; }
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
  it.each([
    "",
    '@extension("x-ms-long-running-operation", true)',
    '@extension("x-ms-long-running-operation-options", #{})',
  ])("reports an empty response set before LRO marker checks: %s", async (decorators) => {
    await tester.expect(patch("Empty", `union Empty {}\n${decorators}`)).toEmitDiagnostics({
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
  const flag = '@extension("x-ms-long-running-operation", true)';

  it("accepts exactly 200, 202 without a body, and default", async () => {
    await tester.expect(patch("Ok | Accepted | ErrorResponse", flag)).toBeValid();
  });

  it.each([
    ["a missing 202", "Ok | ErrorResponse"],
    ["a missing 200", "Accepted | ErrorResponse"],
    ["a missing default", "Ok | Accepted"],
    ["an extra response", "Ok | Accepted | NoContent | ErrorResponse"],
  ])("rejects %s with one response-set warning", async (_, returnType) => {
    await tester.expect(patch(returnType, flag)).toEmitDiagnostics({
      code,
      message: "Long-running PATCH operations must have only 200, 202, and default responses.",
    });
  });

  it("rejects a 202 body independently of the response set", async () => {
    await tester.expect(patch("Ok | AcceptedWithBody | ErrorResponse", flag)).toEmitDiagnostics({
      code,
      message: "The 202 response of a long-running PATCH operation must not have a body.",
    });
  });

  it("rejects a body in one of multiple 202 response variants", async () => {
    await tester
      .expect(patch("Ok | Accepted | AcceptedWithBody | ErrorResponse", flag))
      .toEmitDiagnostics({
        code,
        message: "The 202 response of a long-running PATCH operation must not have a body.",
      });
  });

  it("rejects a body shared by 200 and 202 status codes", async () => {
    await tester
      .expect(
        patch(
          "Both | ErrorResponse",
          `model Both { @statusCode code: 200 | 202; @body value: string; }\n${flag}`,
        ),
      )
      .toEmitDiagnostics({
        code,
        message: "The 202 response of a long-running PATCH operation must not have a body.",
      });
  });

  it("reports both an invalid response set and a 202 body", async () => {
    await tester
      .expect(patch("Ok | AcceptedWithBody | NoContent | ErrorResponse", flag))
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
  it.each(["false", '"yes"'])("treats a non-true marker %s as synchronous", async (marker) => {
    await tester
      .expect(patch("Ok | ErrorResponse", `@extension("x-ms-long-running-operation", ${marker})`))
      .toBeValid();
  });

  it("does not select a truthy non-boolean marker for the missing-202 rule", async () => {
    await tester
      .expect(
        patch("Ok | Accepted | ErrorResponse", '@extension("x-ms-long-running-operation", "yes")'),
      )
      .toEmitDiagnostics({
        code,
        message: "Synchronous PATCH operations must have only 200 and default responses.",
      });
  });

  it.each([
    "",
    '@extension("x-ms-long-running-operation", false)',
    '@extension("x-ms-long-running-operation", "yes")',
  ])("requires a boolean true marker when options are present: %s", async (marker) => {
    await tester
      .expect(
        patch(
          "Ok | Accepted | ErrorResponse",
          `${marker}\n@extension("x-ms-long-running-operation-options", #{})`,
        ),
      )
      .toEmitDiagnostics({
        code,
        message:
          "PATCH operations with long-running options must set x-ms-long-running-operation to true.",
      });
  });

  it("ignores false options when the marker is not true", async () => {
    await tester
      .expect(
        patch("Ok | ErrorResponse", '@extension("x-ms-long-running-operation-options", false)'),
      )
      .toBeValid();
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

  it("honors an explicit false marker overriding semantic LRO metadata", async () => {
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
      .toEmitDiagnostics({
        code,
        message:
          "PATCH operations with long-running options must set x-ms-long-running-operation to true.",
      });
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

describe("compiler diagnostic preservation", () => {
  it.each([
    [
      "structured file with an existing HTTP metadata rule",
      "@typespec/http/http-file-structured",
      `
        @route("/widgets") @patch op update(): {
          @statusCode code: 200;
          @header("content-type") contentType: "application/json";
          @body file: Http.File;
        } | ErrorResponse;
      `,
      // The published rule already resolves this operation's HTTP metadata (#6084).
      "@azure-tools/typespec-azure-resource-manager/no-response-body",
    ],
    [
      "unused content type",
      "@typespec/http/content-type-ignored",
      `
        @route("/widgets") @patch
        op update(@header("content-type") contentType: "application/json"): {
          @statusCode code: 200;
          @body value: string;
        } | ErrorResponse;
      `,
      undefined,
    ],
    [
      "structured file on a GET during LRO metadata lookup",
      "@typespec/http/http-file-structured",
      `
        model Status {
          @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running";
        }
        @route("/widgets") @get op read(): {
          @statusCode code: 200;
          @header("content-type") contentType: "application/json";
          @body file: Http.File;
        } | ErrorResponse;
        @Azure.Core.useFinalStateVia("original-uri")
        @route("/widgets") @patch op update(): {
          @statusCode code: 200;
          @Azure.Core.pollingLocation @header("Operation-Location")
          location: ResourceLocation<Status>;
          @body value: string;
        } | ErrorResponse;
      `,
      undefined,
    ],
  ])(
    "does not duplicate the %s warning when enabled",
    async (_, diagnosticCode, operation, existingRule) => {
      const source = `@armProviderNamespace namespace Microsoft.Contoso; ${operation}`;
      const compile = async (enabled: boolean) => {
        const enable: Record<string, true> = {};
        if (existingRule) enable[existingRule] = true;
        if (enabled) enable[code] = true;
        return (
          await Tester.compileAndDiagnose(source, {
            compilerOptions: { linterRuleSet: { enable } },
          })
        )[1];
      };

      const baseline = await compile(false);
      const withRule = await compile(true);
      const count = (diagnostics: typeof baseline) =>
        diagnostics.filter((diagnostic) => diagnostic.code === diagnosticCode).length;
      expect(count(baseline)).toBeGreaterThan(0);
      expect(count(withRule)).toBe(count(baseline));
    },
    60_000,
  );
});
