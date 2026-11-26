import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { missingErrorResponseRule } from "../../src/rules/missing-error-response.js";

let tester: LinterRuleTester;
const code = "@azure-tools/typespec-azure-resource-manager/missing-error-response";
const diagnostic = {
  code,
  message:
    "Operation is missing an error response for otherwise undeclared failure status codes. Add `CommonTypes.ErrorResponse` as a response to the operation.",
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
    missingErrorResponseRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it.each(["get", "head"])(
  "requires a generic error response for otherwise undeclared failures on %s operations",
  async (verb) => {
    await tester
      .expect(`@${verb} op /*read*/read(): { @statusCode status: 200; };`)
      .toEmitDiagnostics(({ read }) => ({
        ...diagnostic,
        pos: getSourceLocation(read).pos,
        end: getSourceLocation(read).end,
      }));
  },
);

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

it("reports when an operation has no responses", async () => {
  await tester.expect("@get op read(): never;").toEmitDiagnostics(diagnostic);
});

it("requires a generic response to be marked with @error", async () => {
  await tester
    .expect(
      `
      @TypeSpec.OpenAPI.defaultResponse
      model GenericResponse { message: string; }
      @get op read(): string | GenericResponse;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts a generic @error response", async () => {
  await tester
    .expect(
      `
      @error model GenericError { message: string; }
      @get op read(): string | GenericError;
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
