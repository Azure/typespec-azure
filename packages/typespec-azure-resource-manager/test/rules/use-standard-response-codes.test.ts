import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { useStandardResponseCodesRule } from "../../src/rules/use-standard-response-codes.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.files({ "extra.tsp": "" }).import("./extra.tsp").createInstance();
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

it("reports each disallowed response code once across body variants", async () => {
  await tester
    .expect(
      `${header}
      model TextResponse { @statusCode status: 404; @body body: string; }
      model NumericResponse { @statusCode status: 404; @body body: int32; }
      @get op read(): TextResponse | NumericResponse | { @statusCode status: 500; };
    `,
    )
    .toEmitDiagnostics([diagnostic("read", 404), diagnostic("read", 500)]);
});

it("reports concrete endpoints, not the shared template instance", async () => {
  await tester
    .expect(
      `${header}
      @get op Template<T>(): { @statusCode status: 404; @body body: T; };
      @route("/one") op /*read*/read is Template<string>;
      @route("/two") op /*readAgain*/readAgain is Template<string>;
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

it("checks ordinary namespaces without provider metadata", async () => {
  await tester
    .expect(`@service namespace Contoso { @get op read(): { @statusCode status: 404; }; }`)
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks concrete interface endpoints despite template exclusion guards", async () => {
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

it("checks operations without service metadata", async () => {
  await tester
    .expect("@get op read(): { @statusCode status: 404; };")
    .toEmitDiagnostics([diagnostic("read", 404)]);
});

it("checks operations outside a declared service", async () => {
  await tester
    .expect(
      `
        @service namespace Service {
          @get op read(): { @statusCode status: 200; };
        }
        namespace Outside {
          @get op readOutside(): { @statusCode status: 404; };
        }
      `,
    )
    .toEmitDiagnostics([diagnostic("readOutside", 404)]);
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
