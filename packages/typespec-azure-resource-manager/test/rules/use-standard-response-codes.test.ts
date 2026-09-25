import { Tester } from "#test/tester.js";
import { getSourceLocation, navigateProgram } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.files({ "extra.tsp": "" }).import("./extra.tsp").createInstance();
  tester = createLinterRuleTester(
    runner,
    useStandardResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const header = `
  @service
  namespace Contoso.Example;
`;

const resource = `
  @service @armProviderNamespace
  namespace Microsoft.Example;
  model Properties { @visibility(Lifecycle.Read) provisioningState?: ResourceProvisioningState; }
  model Widget is TrackedResource<Properties> {
    ...ResourceNameParameter<Widget>;
  }
`;

function diagnostic(operationName: string, statusCode: number | string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes",
    message: `Operation '${operationName}' defines disallowed response status '${statusCode}'. Use only 200, 201, 202, 204, or default responses.`,
  };
}

it.each([200, 201, 202, 204])("accepts allowed status %s", async (status) => {
  await tester.expect(`${header} @get op read(): { @statusCode status: ${status}; };`).toBeValid();
});

it.each([203, 206, 302, 400, 404, 500])("rejects disallowed status %s", async (status) => {
  await tester
    .expect(`${header} @get op read(): { @statusCode status: ${status}; };`)
    .toEmitDiagnostics([diagnostic("read", status)]);
});

it("accepts a standard default error response", async () => {
  await tester.expect(`${header} @get op read(): string | CommonTypes.ErrorResponse;`).toBeValid();
});

it.each([
  [200, 299],
  [300, 399],
  [400, 499],
])("rejects status range %s-%s", async (start, end) => {
  await tester
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
  await tester
    .expect(
      `${header}
      model Response { @statusCode @minValue(200) @maxValue(200) status: int32; }
      @get op read(): Response;
    `,
    )
    .toBeValid();
});

it("rejects a singleton disallowed range", async () => {
  await tester
    .expect(
      `${header}
      model Response { @statusCode @minValue(404) @maxValue(404) status: int32; }
      @get op read(): Response;
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks inherited and spread status properties once per response code", async () => {
  await tester
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
  await tester
    .expect(
      `${header}
      namespace Nested {
        @get op Template<T>(): { @statusCode status: 404; @body body: T; };
        @route("/one") op /*read*/read is Template<string>;
        @route("/two") op /*readAgain*/readAgain is Template<string>;
      }
    `,
    )
    .toEmitDiagnostics(({ read, readAgain }) =>
      [read, readAgain].map((operation) => ({
        ...diagnostic(operation.name, 404),
        pos: getSourceLocation(operation).pos,
        end: getSourceLocation(operation).end,
      })),
    );
});

it("honors concrete endpoint suppressions without template warnings", async () => {
  await runner.compile(`${header}
    namespace Nested {
      @get op Template<T>(): { @statusCode status: 404; @body body: T; };
      #suppress "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes" "Back compatibility."
      @route("/one") op read is Template<string>;
      #suppress "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes" "Back compatibility."
      @route("/two") op readAgain is Template<string>;
    }
  `);
  navigateProgram(
    runner.program,
    useStandardResponseCodesRule.create({
      program: runner.program,
      options: {},
      reportDiagnostic: ({ target, format }) =>
        runner.program.reportDiagnostic({
          ...diagnostic(format.operationName, format.statusCode),
          severity: "warning",
          target,
        }),
    }),
  );
  expect(runner.program.diagnostics).toEqual([]);
});

it("checks inherited concrete interface endpoints", async () => {
  await tester
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

it("ignores uninstantiated templates while checking project endpoints", async () => {
  await tester
    .expect(
      `${header}
      @get op Template<T>(): { @statusCode status: 500; @body body: T; };
      @get op read(): { @statusCode status: 404; };
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks ordinary namespaces without provider metadata", async () => {
  await tester
    .expect(`@service namespace Contoso { @get op read(): { @statusCode status: 404; }; }`)
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks nested namespaces without provider metadata", async () => {
  await tester
    .expect(
      `${header}
      namespace Nested { @get op read(): { @statusCode status: 302; }; }
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 302)]);
});

it("excludes imported library endpoints while checking project endpoints", async () => {
  await tester
    .expect({
      "node_modules/response-library/package.json": JSON.stringify({
        name: "response-library",
        version: "1.0.0",
        tspMain: "main.tsp",
      }),
      "node_modules/response-library/main.tsp": `
        import "@typespec/http";
        using TypeSpec.Http;
        @service namespace Library {
          @get op libraryRead(): { @statusCode status: 500; };
        }
      `,
      "extra.tsp": `import "response-library";`,
      "main.tsp": `
        ${header}
        @get op read(): { @statusCode status: 404; };
      `,
    })
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks standard ARM read response customizations", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        read is ArmResourceRead<Widget, Response = ArmResponse<Widget> | NotFoundResponse>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("rejects an explicit error response on a standard ARM action", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        check is ArmResourceActionSync<Widget, void, ArmResponse<Widget>, Error = NotFoundResponse>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("check", 404)]);
});

it("accepts a standard ARM action with the default error response", async () => {
  await tester
    .expect(
      `${resource}
      @armResourceOperations interface Widgets {
        check is ArmResourceActionSync<Widget, void, ArmResponse<Widget>>;
      }
    `,
    )
    .toBeValid();
});

it("rejects a redirect response in a nested provider namespace", async () => {
  await tester
    .expect(
      `${resource}
      model RedirectResponse {
        @statusCode status: 302;
        @header("Location") location: string;
      }
      namespace Nested {
        @armResourceOperations interface Widgets {
          redirect is ArmResourceActionSync<Widget, void, ArmResponse<Widget> | RedirectResponse>;
        }
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("redirect", 302)]);
});

it("rejects a status range on a standard ARM action", async () => {
  await tester
    .expect(
      `${resource}
      model RedirectRangeResponse {
        @statusCode @minValue(300) @maxValue(399) status: int32;
        @header("Location") location: string;
      }
      @armResourceOperations interface Widgets {
        redirect is ArmResourceActionSync<Widget, void, ArmResponse<Widget> | RedirectRangeResponse>;
      }
    `,
    )
    .toEmitDiagnostics([diagnostic("redirect", "300-399")]);
});

const documentation = readFileSync(
  new URL("../../src/rules/use-standard-response-codes.md", import.meta.url),
  "utf8",
);
const examples = [...documentation.matchAll(/```tsp\r?\n([\s\S]*?)```/g)].map((match) => match[1]);

it("diagnoses the incorrect documentation example", async () => {
  expect(examples).toHaveLength(2);
  await tester
    .expect({ "main.tsp": "", "extra.tsp": examples[0] })
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("accepts the correct documentation example", async () => {
  expect(examples).toHaveLength(2);
  await tester.expect({ "main.tsp": "", "extra.tsp": examples[1] }).toBeValid();
});
