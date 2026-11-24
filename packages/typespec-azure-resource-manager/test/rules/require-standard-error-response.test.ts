import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, expect, it } from "vitest";
import { requireStandardErrorResponseRule } from "../../src/rules/require-standard-error-response.js";

let tester: LinterRuleTester;
const code = "@azure-tools/typespec-azure-resource-manager/require-standard-error-response";
const diagnostic = {
  code,
  message:
    "Operation is missing a standard error response. Include the standard ARM ErrorResponse.",
};
const resource = `
  @armProviderNamespace
  namespace Microsoft.Contoso;
  model Widget is ProxyResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    requireStandardErrorResponseRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it.each(["get", "head"])("requires a standard error response on %s operations", async (verb) => {
  await tester
    .expect(`@${verb} op /*read*/read(): { @statusCode status: 200; };`)
    .toEmitDiagnostics(({ read }) => ({
      ...diagnostic,
      pos: getSourceLocation(read).pos,
      end: getSourceLocation(read).end,
    }));
});

it.each(["ExplicitError", "RangedError"])(
  "does not mistake %s for a generic error response",
  async (response) => {
    await tester
      .expect(
        `
      @error model ExplicitError { @statusCode status: 500; message: string; }
      @error model RangedError {
        @statusCode @minValue(400) @maxValue(599) status: int32;
        message: string;
      }
      @get op read(): string | ${response};
    `,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it("reports once for an operation with no responses", async () => {
  await tester.expect("@get op read(): never;").toEmitDiagnostics(diagnostic);
});

it("accepts a generic response without requiring error marking", async () => {
  await tester
    .expect(
      `
      @TypeSpec.OpenAPI.defaultResponse
      model GenericResponse { message: string; }
      @get op read(): string | GenericResponse;
    `,
    )
    .toBeValid();
});

it("checks a removed standard error response on an ARM template", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget, Error = never>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts an ARM template with its standard error response", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("reports independently of existing ARM response-code diagnostics", async () => {
  const responseCodes =
    "@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes";
  const [, diagnostics] = await Tester.compileAndDiagnose(
    `${resource}
    @armResourceOperations interface Widgets {
      create is ArmResourceCreateOrReplaceSync<Widget, Error = never>;
    }
  `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: { [code]: true, [responseCodes]: true },
        },
      },
    },
  );
  expect(diagnostics.map((diagnostic) => diagnostic.code).sort()).toEqual(
    [code, responseCodes].sort(),
  );
});

it("reports independently of a missing-error diagnostic", async () => {
  const standardError = "@azure-tools/typespec-azure-resource-manager/use-standard-error";
  const [, diagnostics] = await Tester.compileAndDiagnose("@get op read(): string;", {
    compilerOptions: {
      linterRuleSet: {
        enable: { [code]: true, [standardError]: true },
      },
    },
  });
  expect(diagnostics.map((diagnostic) => diagnostic.code).sort()).toEqual(
    [code, standardError].sort(),
  );
});

it("leaves generic error-payload validation to use-standard-error", async () => {
  const standardError = "@azure-tools/typespec-azure-resource-manager/use-standard-error";
  const [, diagnostics] = await Tester.compileAndDiagnose(
    `
      @error model CustomError { message: string; }
      @get op read(): string | CustomError;
    `,
    { compilerOptions: { linterRuleSet: { enable: { [code]: true, [standardError]: true } } } },
  );
  expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([standardError]);
});
