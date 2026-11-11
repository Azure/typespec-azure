import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { requireErrorDecoratorRule } from "../../src/rules/require-error-decorator.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    requireErrorDecoratorRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function diagnostic(statusCode: number | string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/require-error-decorator",
    severity: "warning" as const,
    message: `Response status '${statusCode}' must use a response model marked with @error.`,
  };
}

it.each([400, 404, 499, 500, 599])("rejects an unmarked %s response", async (statusCode) => {
  await tester
    .expect(`@get op read(): { @statusCode status: ${statusCode}; @body body: string; };`)
    .toEmitDiagnostics(diagnostic(statusCode));
});

it("reports each response status once, including bodyless errors", async () => {
  await tester
    .expect(
      `
      model TextError { @statusCode status: 400; @body body: string; }
      model NumericError { @statusCode status: 400; @body body: int32; }
      @post op /*read*/read(): TextError | NumericError | { @statusCode status: 500; };
    `,
    )
    .toEmitDiagnostics(({ read }) =>
      [400, 500].map((statusCode) => ({
        ...diagnostic(statusCode),
        pos: getSourceLocation(read).pos,
        end: getSourceLocation(read).end,
      })),
    );
});

it("still checks an explicit error when a marked default error is present", async () => {
  await tester
    .expect(
      `
      model Unmarked { @statusCode status: 400; @body body: CommonTypes.ErrorResponse; }
      @get op read(): string | Unmarked | CommonTypes.ErrorResponse;
    `,
    )
    .toEmitDiagnostics(diagnostic(400));
});

it("requires the response envelope, not just its body, to be marked", async () => {
  await tester
    .expect(
      `
      @error model Payload { code: string; }
      model Envelope { @statusCode status: 500; @body body: Payload; }
      @get op read(): Envelope;
    `,
    )
    .toEmitDiagnostics(diagnostic(500));
});

it("accepts marked responses without imposing an error payload shape", async () => {
  await tester
    .expect(
      `
      @error model ClientError { @statusCode status: 400; @body body: string; }
      @error model ServerError { @statusCode status: 500; }
      @get op read(): ClientError | ServerError;
    `,
    )
    .toBeValid();
});

it.each([200, 302, 399])("ignores an unmarked non-error status %s", async (statusCode) => {
  await tester.expect(`@get op read(): { @statusCode status: ${statusCode}; };`).toBeValid();
});

it("accepts success-only operations and default error responses", async () => {
  await tester
    .expect(
      `
      @error model Fallback { message: string; }
      @route("/success") @get op success(): string;
      @route("/fallback") @get op fallback(): string | Fallback;
    `,
    )
    .toBeValid();
});

it.each([400, 500])("does not exempt HEAD %s responses", async (statusCode) => {
  await tester
    .expect(`@head op check(): { @statusCode status: ${statusCode}; };`)
    .toEmitDiagnostics(diagnostic(statusCode));
});

it("exempts only the HEAD 404 response in an operation", async () => {
  await tester
    .expect(
      `
      @head op check():
        { @statusCode status: 204; } |
        { @statusCode status: 404; } |
        { @statusCode status: 500; };
    `,
    )
    .toEmitDiagnostics(diagnostic(500));
});

it.each([
  [400, 499],
  [500, 599],
  [400, 599],
  [399, 400],
])("rejects an unmarked status range %s-%s", async (start, end) => {
  await tester
    .expect(
      `
      model RangedResponse {
        @statusCode @minValue(${start}) @maxValue(${end}) status: int32;
      }
      @get op read(): RangedResponse;
    `,
    )
    .toEmitDiagnostics(diagnostic(`${start}-${end}`));
});

it("accepts a marked status range and an unmarked non-error range", async () => {
  await tester
    .expect(
      `
      model Success { @statusCode @minValue(200) @maxValue(299) status: int32; }
      @error model Failure { @statusCode @minValue(400) @maxValue(599) status: int32; }
      @get op read(): Success | Failure;
    `,
    )
    .toBeValid();
});

it("exempts a singleton HEAD 404 range but not a broader range", async () => {
  await tester
    .expect(
      `
      model NotFound { @statusCode @minValue(404) @maxValue(404) status: int32; }
      model ClientError { @statusCode @minValue(400) @maxValue(499) status: int32; }
      @head op check(): NotFound | ClientError;
    `,
    )
    .toEmitDiagnostics(diagnostic("400-499"));
});

it.each([
  ["Unmarked | Marked", true],
  ["Marked | Unmarked", false],
] as const)("checks the representative response type for %s", async (responses, warns) => {
  const expectation = tester.expect(`
    model Unmarked { @statusCode status: 400; @body body: string; }
    @error model Marked { @statusCode status: 400; @body body: string; }
    @get op read(): ${responses};
  `);
  if (warns) {
    await expectation.toEmitDiagnostics(diagnostic(400));
  } else {
    await expectation.toBeValid();
  }
});

it("reports concrete endpoints rather than their shared template instance", async () => {
  await tester
    .expect(
      `
      @get op ReadError<T>(): { @statusCode status: 400; @body body: T; };
      @route("/one") op /*one*/one is ReadError<string>;
      @route("/two") op /*two*/two is ReadError<string>;
    `,
    )
    .toEmitDiagnostics(({ one, two }) =>
      [one, two].map((operation) => ({
        ...diagnostic(400),
        pos: getSourceLocation(operation).pos,
        end: getSourceLocation(operation).end,
      })),
    );
});

it("recognizes an inherited error marker", async () => {
  await tester
    .expect(
      `
      @error model Failure {}
      model BadRequest extends Failure { @statusCode status: 400; }
      @get op read(): BadRequest;
    `,
    )
    .toBeValid();
});

it("checks a custom error on a standard ARM operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      model BadRequest { @statusCode status: 400; @body body: CommonTypes.ErrorResponse; }
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget, Error = BadRequest>;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic(400));
});

it("accepts standard ARM read and existence-check templates", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
        checkExistence is ArmResourceCheckExistence<Widget>;
      }
    `,
    )
    .toBeValid();
});
