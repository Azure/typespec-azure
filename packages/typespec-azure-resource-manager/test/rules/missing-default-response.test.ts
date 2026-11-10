import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, expect, it } from "vitest";
import { missingDefaultResponseRule } from "../../src/rules/missing-default-response.js";

let tester: LinterRuleTester;
const code = "@azure-tools/typespec-azure-resource-manager/missing-default-response";
const diagnostic = {
  code,
  message: "Operation is missing a default response. Include the standard ARM ErrorResponse.",
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
    missingDefaultResponseRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it.each(["get", "put", "patch", "post", "delete", "head"])(
  "requires a default response on %s operations",
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

it.each([
  "NotFoundResponse",
  "ExplicitError",
  "RangedError",
  "NotFoundResponse | ExplicitError | RangedError",
])("does not mistake %s for a default response", async (response) => {
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
});

it("reports once for an operation with no responses", async () => {
  await tester.expect("@get op read(): never;").toEmitDiagnostics(diagnostic);
});

it.each(["CommonTypes.ErrorResponse", "CustomError", "ExplicitDefault"])(
  "accepts the default response %s without requiring a particular error shape",
  async (response) => {
    await tester
      .expect(
        `
        @error model CustomError { message: string; }
        @TypeSpec.OpenAPI.defaultResponse
        model ExplicitDefault { message: string; }
        @get op read(): string | ${response};
      `,
      )
      .toBeValid();
  },
);

it("reports distinct concrete operations using the same response customization", async () => {
  await tester
    .expect(
      `
      op ReadResource<T>(): T;
      @get @route("/one") op readOne is ReadResource<string>;
      @get @route("/two") op readTwo is ReadResource<string>;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("checks inherited concrete operations rather than the uninstantiated interface", async () => {
  await tester
    .expect(
      `
      interface Reads<T> { @get op read(): T; }
      @route("/widgets") interface Widgets extends Reads<string> {}
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it.each(["ArmResourceRead", "ArmResourceCheckExistence", "ArmResourceActionSync"])(
  "checks a removed default on %s",
  async (template) => {
    const arguments_ =
      template === "ArmResourceActionSync"
        ? "Widget, void, void, Error = never"
        : "Widget, Error = never";
    await tester
      .expect(
        `${resource}
        @armResourceOperations interface Widgets {
          run is ${template}<${arguments_}>;
        }
      `,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it("accepts standard ARM templates with their default error responses", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget>;
        check is ArmResourceCheckExistence<Widget>;
        action is ArmResourceActionSync<Widget, void, void>;
      }
    `,
    )
    .toBeValid();
});

it.each([
  [
    "put",
    "ArmResourceCreateOrReplaceSync<Widget, Error = never>",
    "arm-put-operation-response-codes",
  ],
  [
    "post",
    "ArmResourceActionSync<Widget, void, void, Error = never>",
    "arm-post-operation-response-codes",
  ],
  [
    "async post",
    "ArmResourceActionAsync<Widget, void, void, Error = never>",
    "arm-post-operation-response-codes",
  ],
  ["delete", "ArmResourceDeleteSync<Widget, Error = never>", "arm-delete-operation-response-codes"],
])(
  "does not repeat the existing %s resource response diagnostic",
  async (_verb, template, rule) => {
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `${resource}
    @armResourceOperations interface Widgets { run is ${template}; }
  `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              [code]: true,
              [`@azure-tools/typespec-azure-resource-manager/${rule}`]: true,
            },
          },
        },
      },
    );
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      `@azure-tools/typespec-azure-resource-manager/${rule}`,
    ]);
  },
);

it.each([false, true])(
  "does not repeat a missing-error diagnostic regardless of rule order: %s",
  async (defaultFirst) => {
    const standardError = "@azure-tools/typespec-azure-resource-manager/use-standard-error";
    const [, diagnostics] = await Tester.compileAndDiagnose("@get op read(): string;", {
      compilerOptions: {
        linterRuleSet: {
          enable: defaultFirst
            ? { [code]: true, [standardError]: true }
            : { [standardError]: true, [code]: true },
        },
      },
    });
    expect(diagnostics).toMatchObject([
      {
        code: standardError,
        message: "Operations must define at least one response marked with `@error`.",
      },
    ]);
    expect(diagnostics).toHaveLength(1);
  },
);

it("retains independent error-payload and missing-default diagnostics", async () => {
  const standardError = "@azure-tools/typespec-azure-resource-manager/use-standard-error";
  const [, diagnostics] = await Tester.compileAndDiagnose(
    `
      @error model CustomError { @statusCode status: 500; message: string; }
      @get op read(): string | CustomError;
    `,
    { compilerOptions: { linterRuleSet: { enable: { [code]: true, [standardError]: true } } } },
  );
  expect(diagnostics.map((diagnostic) => diagnostic.code).sort()).toEqual(
    [code, standardError].sort(),
  );
});
