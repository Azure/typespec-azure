import { getSourceLocation, navigateProgram, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, expect, it, vi } from "vitest";
import { noErrorCodeResponsesRule } from "../../src/rules/no-error-code-responses.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

const header = `
  using TypeSpec.Http;
  using TypeSpec.Rest;
  using Azure.ResourceManager;
  @service @armProviderNamespace
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Microsoft.Example;
`;

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    noErrorCodeResponsesRule,
    "tsp-lintdiff-local-linter",
  );
}

function diagnostic(operationName: string, statusCode: number | string) {
  return {
    code: "tsp-lintdiff-local-linter/no-error-code-responses",
    message: `Operation '${operationName}' defines explicit error status code '${statusCode}'. Remove it and use the default response for errors instead.`,
  };
}

describe("no-error-code-responses", () => {
  it.each([200, 201, 202, 204])("accepts allowed status %s", async (status) => {
    await (
      await tester()
    )
      .expect(`${header} @get op read(): { @statusCode status: ${status}; };`)
      .toBeValid();
  });

  it.each([203, 206, 302, 400, 404, 500])("rejects disallowed status %s", async (status) => {
    await (
      await tester()
    )
      .expect(`${header} @get op read(): { @statusCode status: ${status}; };`)
      .toEmitDiagnostics([diagnostic("read", status)]);
  });

  it("accepts a standard default error response", async () => {
    await (
      await tester()
    )
      .expect(`${header} @get op read(): string | CommonTypes.ErrorResponse;`)
      .toBeValid();
  });

  it.each([
    [200, 299],
    [300, 399],
    [400, 499],
  ])("rejects status range %s-%s", async (start, end) => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Response {
          @statusCode @minValue(${start}) @maxValue(${end}) status: int32;
        }
        @get op read(): Response;
      `,
      )
      .toEmitDiagnostics([diagnostic("read", `${start}-${end}`)]);
  });

  it("accepts a singleton allowed range", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Response { @statusCode @minValue(200) @maxValue(200) status: int32; }
        @get op read(): Response;
      `,
      )
      .toBeValid();
  });

  it("checks inherited and spread status properties once per response code", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Base { @statusCode status: 404; }
        model Inherited extends Base { @body body: string; }
        model Spread { ...Base; @body body: int32; }
        @get op read(): Inherited | Spread | { @statusCode status: 500; };
      `,
      )
      .toEmitDiagnostics([diagnostic("read", 404), diagnostic("read", 500)]);
  });

  it("reports concrete endpoints, not the shared nested template instance", async () => {
    const code = `${header}
      namespace Nested {
        @get op Template<T>(): { @statusCode status: 404; @body body: T; };
        @route("/one") op /*read*/read is Template<string>;
        @route("/two") op /*readAgain*/readAgain is Template<string>;
      }
    `;
    await (await tester()).expect(code).toEmitDiagnostics(({ read, readAgain }) =>
      [read, readAgain].map((operation) => ({
        ...diagnostic(operation.name, 404),
        pos: getSourceLocation(operation).pos,
        end: getSourceLocation(operation).end,
      })),
    );
  });

  it("honors concrete endpoint suppressions without template warnings", async () => {
    const instance = await Tester.createInstance();
    await instance.compile(`${header}
      namespace Nested {
        @get op Template<T>(): { @statusCode status: 404; @body body: T; };
        #suppress "tsp-lintdiff-local-linter/no-error-code-responses" "Back compatibility."
        @route("/one") op read is Template<string>;
        #suppress "tsp-lintdiff-local-linter/no-error-code-responses" "Back compatibility."
        @route("/two") op readAgain is Template<string>;
      }
    `);
    navigateProgram(
      instance.program,
      noErrorCodeResponsesRule.create({
        program: instance.program,
        options: {},
        reportDiagnostic: ({ target, format }) =>
          instance.program.reportDiagnostic({
            ...diagnostic(format.operationName, format.statusCode),
            severity: "warning",
            target,
          }),
      }),
    );
    expect(instance.program.diagnostics).toEqual([]);
  });

  it("checks inherited concrete interface endpoints", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        interface Templates<T> {
          @get op read(): { @statusCode status: 404; @body body: T; };
        }
        @route("/items") interface Items extends Templates<string> {}
      `,
      )
      .toEmitDiagnostics([diagnostic("read", 404)]);
  });

  it("ignores data-plane endpoints and uninstantiated generic operations", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        using Azure.ResourceManager;
        @service namespace DataPlane { @get op read(): { @statusCode status: 404; }; }
        @service @armProviderNamespace namespace Microsoft.Example {
          @get op Template<T>(): { @statusCode status: 404; @body body: T; };
        }
      `,
      )
      .toBeValid();
  });

  it("checks standard ARM response customizations", async () => {
    await (
      await tester()
    )
      .expect(
        `${header}
        model Properties { provisioningState?: ResourceProvisioningState; }
        model Widget is TrackedResource<Properties> {
          @key("widgetName") @segment("widgets") name: string;
        }
        @armResourceOperations interface Widgets {
          read is ArmResourceRead<Widget, Response = ArmResponse<Widget> | NotFoundResponse>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("read", 404)]);
  });
});
